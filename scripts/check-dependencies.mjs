import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const npmCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const npmArguments = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm audit --json'] : ['audit', '--json'];
const audit = spawnSync(npmCommand, npmArguments, {
  encoding: 'utf8', timeout: 60000,
});
if (audit.error) throw audit.error;
const report = JSON.parse(audit.stdout);
if (report.error || !report.vulnerabilities) throw new Error('Dependency audit unavailable');
const exceptions = JSON.parse(readFileSync(new URL('../security/audit-exceptions.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const found = new Map();
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const advisory of vulnerability.via) {
    if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity)) continue;
    found.set(advisory.url.split('/').pop(), advisory);
  }
}
const failures = [];
for (const [id, advisory] of found) {
  const accepted = exceptions.find(exception => exception.advisory === id && exception.package === advisory.name
    && Date.parse(`${exception.expires}T23:59:59Z`) > Date.now()
    && Object.entries(lock.packages).some(([path]) => path.endsWith(`node_modules/${exception.package}`))
    && Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${exception.package}`))
      .every(([, entry]) => entry.version === exception.version));
  if (!accepted) failures.push(`${id}: ${advisory.title}`);
  else console.log(`Temporary exception ${id}, expires ${accepted.expires}: ${accepted.reason}`);
}
for (const exception of exceptions) {
  if (!found.has(exception.advisory)) failures.push(`Remove obsolete exception ${exception.advisory}`);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('Dependency gate passed: no unaccepted high or critical advisories.');
