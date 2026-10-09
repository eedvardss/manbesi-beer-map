// Fails on any high or critical npm advisory that is not explicitly accepted below.
// npm audit has no ignore mechanism, so each exception is listed here with its
// reason and a revisit date after which it fails again.
import { execSync } from 'node:child_process';

const accepted = {
  // braces <=3.0.3 (latest): stack exhaustion from deeply nested glob patterns.
  // No patched release exists. Reached only through build tooling (vinext ->
  // vite-plugin-commonjs -> fast-glob, and the shadcn CLI / ts-morph), which
  // expands developer-authored patterns, never request input.
  'GHSA-vfj7-8cjw-p6xm': '2027-01-31',
};

let output;
try {
  output = execSync('npm audit --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  output = error.stdout;
}
const report = JSON.parse(output);
if (report.error) throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);

const today = new Date().toISOString().slice(0, 10);
const failures = new Map();
const seen = new Set();
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
  for (const advisory of entry.via) {
    if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity)) continue;
    const id = advisory.url.split('/').pop();
    seen.add(id);
    const revisit = accepted[id];
    if (revisit && revisit >= today) continue;
    const note = revisit ? ` (exception expired ${revisit})` : '';
    failures.set(id, `${advisory.severity} ${name}: ${advisory.title} ${advisory.url}${note}`);
  }
}

for (const id of Object.keys(accepted)) {
  if (!seen.has(id)) console.warn(`Accepted advisory ${id} no longer appears; remove it from the list.`);
}
if (failures.size) {
  console.error([...failures.values()].join('\n'));
  process.exit(1);
}
const counts = report.metadata.vulnerabilities;
console.log(
  `No unaccepted high/critical advisories (total: ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low).`,
);
