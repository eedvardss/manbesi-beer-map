import { performance } from 'node:perf_hooks';
import { createVenueQuery, type PriceBand, type SortMode } from '../app/beer-query';
import { mapVenues } from '../app/venues';

// Actual catalog, interactive search prefixes and all serving-price modes.
// This is a repeatable CPU microbenchmark, not a browser loading/FPS score.
const searches = ['', 'a', 'al', 'ala', 'IPA', 'Brengulu', 'Peldu', 'no-such-beer'];
const bands: PriceBand[] = ['all', 'under5', 'fiveToSix', 'over6'];
const sorts: SortMode[] = ['price', 'litre', 'name'];
let checksum = 0;
const prepareStart = performance.now();
const queryCatalog = createVenueQuery(mapVenues);
const prepareMs = performance.now() - prepareStart;
const run = (iteration: number) => {
  for (let i = 0; i < searches.length; i++) {
    const result = queryCatalog(searches[i], bands[(iteration + i) % bands.length], sorts[(iteration + i) % sorts.length]);
    checksum += result.length + (result[0]?.price ?? 0);
  }
};
for (let i = 0; i < 10; i++) run(i);
const samples: number[] = [];
for (let i = 0; i < 80; i++) {
  const start = performance.now();
  run(i);
  samples.push((performance.now() - start) / searches.length);
}
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ workload: '165 venues / 2550 servings, mixed search/band/sort', runtime: process.version, queries: samples.length * searches.length, prepareMs, medianMs: samples[40], p95Ms: samples[76], checksum }, null, 2));
