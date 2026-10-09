import { createServer } from 'node:http';
import { createServer as createTlsServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';

const secret = readFileSync(process.env.HOLMES_API_KEY_FILE ?? '/credentials/api-key', 'utf8').trim();
if (secret.length < 32) throw new Error('A strong investigation API key is required');
const seen = new Map();
let busy = false;
let day = new Date().toISOString().slice(0, 10);
let calls = 0;
async function handleRequest(request, response) {
  if (request.url === '/api/live' && request.method === 'GET') { response.end('alive'); return; }
  const actual = Buffer.from(request.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) { response.writeHead(401).end(); return; }
  if (request.url !== '/alerts' || request.method !== 'POST') { response.writeHead(404).end(); return; }
  let raw = '';
  for await (const chunk of request) {
    raw += chunk.toString();
    if (Buffer.byteLength(raw) > 262144) { response.writeHead(413).end(); return; }
  }
  let body;
  try { body = JSON.parse(raw); } catch { response.writeHead(400).end(); return; }
  if (!Array.isArray(body?.alerts) || body.alerts.length > 10) { response.writeHead(400).end(); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; calls = 0; seen.clear(); }
  const alert = body.alerts.find(item => item?.status === 'firing' && ['BeerMapDatabaseUnavailable', 'BeerMapServerErrors'].includes(item.labels?.alertname));
  if (!alert) { response.writeHead(202).end(); return; }
  const fingerprint = String(alert.fingerprint ?? alert.labels.alertname);
  if (seen.get(fingerprint) > Date.now() - 3600000) { response.writeHead(202).end(); return; }
  if (busy || calls >= 20) { response.writeHead(429).end(); return; }
  busy = true;
  calls++;
  seen.set(fingerprint, Date.now());
  response.writeHead(202).end();
  void investigate(alert).finally(() => {busy = false;});
}

async function investigate(alert) {
  try {
    const result = await fetch(`${process.env.HOLMES_URL ?? 'https://holmes:5050'}/api/chat`, {
      method: 'POST', signal: AbortSignal.timeout(120000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        model: 'beer-map', stream: false,
        ask: `Investigate ${alert.labels.alertname}. All Kubernetes queries MUST explicitly use namespace beer-map or observability; cluster-wide queries are forbidden. Inspect beer-map-db and beer-map, then recent Prometheus/Loki evidence. Give a concise final diagnosis within eight steps, including if the condition has recovered. Never change resources or disclose credentials. Recovery and rollback require human review.`,
      }),
    });
    if (!result.ok) throw new Error(`Holmes returned ${result.status}`);
    const investigation = await result.json();
    console.log(JSON.stringify({ event: 'alert_investigation', alert: alert.labels.alertname, investigation, requiresHumanApproval: true }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'investigation_failed', message: error.message }));
  }
}
const handler = (request, response) => {
  void handleRequest(request, response).catch(error => {
    console.error(JSON.stringify({event: 'request_failed', message: error.message}));
    if (!response.headersSent) response.writeHead(500).end();
    else response.destroy();
  });
};
const certFile = process.env.TLS_CERT_FILE;
const keyFile = process.env.TLS_KEY_FILE;
if (Boolean(certFile) !== Boolean(keyFile) || (process.env.NODE_ENV === 'production' && !certFile)) {
  throw new Error('Production investigation endpoints require both TLS certificate and key');
}
const server = certFile
  ? createTlsServer({cert: readFileSync(certFile), key: readFileSync(keyFile)}, handler)
  : createServer(handler);
server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0', () => {
  console.log(JSON.stringify({event: 'investigation_bridge_started', port: server.address().port}));
});
process.once('SIGTERM', () => server.close());
