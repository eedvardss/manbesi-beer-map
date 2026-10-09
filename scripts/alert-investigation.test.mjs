import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';

await test('investigation bridge authenticates, accepts promptly, bounds input and deduplicates calls', {timeout: 15000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'beer-map-bridge-'));
  const secret = randomBytes(48).toString('hex');
  const credentials = join(directory, 'api-key');
  await writeFile(credentials, secret, {mode: 0o600});
  let calls = 0;
  let finish;
  const pending = new Promise(resolve => {finish = resolve;});
  const holmes = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, `Bearer ${secret}`);
    calls++;
    let body = '';
    for await (const chunk of request) body += chunk;
    const query = JSON.parse(body);
    assert.equal(query.model, 'beer-map');
    assert.match(query.ask, /human review/);
    await pending;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({analysis: 'Read-only diagnosis'}));
  });
  holmes.listen(0, '127.0.0.1');
  await once(holmes, 'listening');
  const child = spawn(process.execPath, ['scripts/alert-investigation.mjs'], {
    env: {...process.env, NODE_ENV: 'test', PORT: '0', HOLMES_API_KEY_FILE: credentials, HOLMES_URL: `http://127.0.0.1:${holmes.address().port}`},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => {output += chunk;});
  try {
    const port = await new Promise((resolve, reject) => {
      let buffer = '';
      child.once('exit', code => reject(new Error(`Bridge exited: ${code}`)));
      child.stdout.on('data', chunk => {
        buffer += chunk;
        for (const line of buffer.split('\n')) {
          try {const event = JSON.parse(line); if (event.event === 'investigation_bridge_started') resolve(event.port);} catch {}
        }
      });
    });
    const url = `http://127.0.0.1:${port}`;
    const headers = {Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json'};
    const send = body => fetch(`${url}/alerts`, {method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(1000)});
    assert.equal((await fetch(`${url}/alerts`, {method: 'POST', body: '{}'})).status, 401);
    assert.equal((await send(null)).status, 400);
    assert.equal((await send({alerts: [null]})).status, 202);
    assert.equal((await send({alerts: Array(11).fill({})})).status, 400);
    assert.equal((await fetch(`${url}/alerts`, {method: 'POST', headers, body: 'x'.repeat(262145)})).status, 413);
    const alert = fingerprint => ({alerts: [{status: 'firing', labels: {alertname: 'BeerMapDatabaseUnavailable'}, fingerprint}]});
    assert.equal((await send(alert('one'))).status, 202, 'Must accept before the model finishes');
    assert.equal((await send(alert('two'))).status, 429, 'Only one model request may run');
    assert.equal((await send(alert('one'))).status, 202, 'Repeated alert must be deduplicated');
    finish();
    for (let attempt = 0; attempt < 100 && !output.includes('alert_investigation"'); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(calls, 1);
    assert.match(output, /"requiresHumanApproval":true/);
    assert.ok(!output.includes(secret), 'Credentials must not enter the report');
  } finally {
    finish();
    child.kill();
    await new Promise(resolve => holmes.close(resolve));
    await rm(directory, {recursive: true, force: true});
  }
});
