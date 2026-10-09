import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';

// An isolated, short-lived Community server is used on untrusted PRs. Never
// connect this bootstrap script to a shared Sonar installation.
const host = process.env.SONAR_HOST_URL ?? 'http://127.0.0.1:9000';
let password = 'admin';
async function post(path, parameters) {
  const response = await fetch(`${host}/api/${path}`, {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}` },
    body: new URLSearchParams(parameters),
  });
  if (!response.ok) throw new Error(`Sonar ${path} failed (${response.status}): ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}
const newPassword = `Aa1!${randomBytes(32).toString('hex')}`;
await post('users/change_password', { login: 'admin', previousPassword: password, password: newPassword });
password = newPassword;
await post('projects/create', { project: 'beer-map', name: 'Beer Map' });
const gate = await post('qualitygates/create', { name: 'Beer Map correctness and security' });
const details = await fetch(`${host}/api/qualitygates/show?name=${encodeURIComponent(gate.name)}`, {
  headers: {Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`},
});
if (!details.ok) throw new Error('Cannot inspect the isolated quality gate');
// New gates inherit Sonar's default new-code conditions. This ephemeral server
// has no meaningful historical baseline; coverage is enforced by c8 separately.
for (const condition of (await details.json()).conditions) {
  await post('qualitygates/delete_condition', {id: condition.id});
}
for (const metric of ['software_quality_reliability_rating', 'software_quality_security_rating']) {
  await post('qualitygates/create_condition', { gateName: gate.name, metric, op: 'GT', error: '1' });
}
await post('qualitygates/select', { gateName: gate.name, projectKey: 'beer-map' });
const { token } = await post('user_tokens/generate', { name: 'isolated-analysis', type: 'PROJECT_ANALYSIS_TOKEN', projectKey: 'beer-map' });
if (process.env.GITHUB_ENV) {
  console.log(`::add-mask::${token}`);
  appendFileSync(process.env.GITHUB_ENV, `SONAR_TOKEN=${token}\n`);
} else {
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/sonar-token', token, { mode: 0o600 });
}
console.log('Isolated Sonar project created; administrator password rotated.');
