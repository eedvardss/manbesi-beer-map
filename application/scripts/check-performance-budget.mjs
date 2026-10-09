import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const directory = 'dist/client/_next/static/chunks';
const pages = readdirSync(directory).filter((file) =>
  /^page-.*\.js$/.test(file),
);
assert.equal(
  pages.length,
  2,
  'Map and reviewer route budgets must cover both pages',
);
for (const pageName of pages) {
  const page = readFileSync(`${directory}/${pageName}`);
  const gzipBytes = gzipSync(page).length;
  // Includes page controls; venue data now comes from the catalog API.
  // Renderer and worker have separate chunks;
  // this is not a total-transfer budget or a Core Web Vitals measurement.
  assert(
    page.length <= 300_000,
    `Page hydration JS grew to ${page.length} bytes (300000 limit)`,
  );
  assert(
    gzipBytes <= 100_000,
    `Page hydration gzip grew to ${gzipBytes} bytes (100000 limit)`,
  );
  assert(
    !page.includes('Folkklubs ALA Pagrabs'),
    'Venue data must come from the API, not the client bundle',
  );
  assert(
    !page.includes('maplibre-gl-js version'),
    'Keep MapLibre in its deferred runtime chunk',
  );
  console.log(
    `Page hydration budget passes: ${page.length} bytes / ${gzipBytes} gzip bytes.`,
  );
}
