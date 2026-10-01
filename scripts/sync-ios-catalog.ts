import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { catalog } from '../app/catalog';

const target = new URL('../ios/BeerMap/Resources/venues.json', import.meta.url);
const contents = `${JSON.stringify(catalog)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== contents) {
    throw new Error('The iPhone catalog is out of date. Run npm run sync:ios-data.');
  }
} else {
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, contents);
}
console.log(`iPhone catalog: ${catalog.venues.length} venues, ${catalog.venues.reduce((total, venue) => total + venue.beers.length, 0)} servings; research checked ${catalog.checkedAt}.`);
