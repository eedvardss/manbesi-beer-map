import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const directory = 'dist/client/_next/static/chunks';
const pages = readdirSync(directory).filter((file) => /^page-.*\.js$/.test(file));
assert.equal(pages.length, 1, 'Revisit route budgets when adding a page');
const page = readFileSync(`${directory}/${pages[0]}`);
const gzipBytes = gzipSync(page).length;
// Includes page data/controls. Renderer and worker have separate chunks;
// this is not a total-transfer budget or a Core Web Vitals measurement.
assert(page.length <= 1_000_000, `Page hydration JS grew to ${page.length} bytes (1000000 limit)`);
assert(gzipBytes <= 250_000, `Page hydration gzip grew to ${gzipBytes} bytes (250000 limit)`);
assert(!page.includes('maplibre-gl-js version'), 'Keep MapLibre in its deferred runtime chunk');
console.log(`Page hydration budget passes: ${page.length} bytes / ${gzipBytes} gzip bytes.`);
