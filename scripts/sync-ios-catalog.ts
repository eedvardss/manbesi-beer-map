import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { catalog } from '../app/catalog';

const target = new URL('../ios/BeerMap/Resources/venues.json', import.meta.url);
const contents = `${JSON.stringify(catalog)}\n`;
if (process.argv.includes('--check')) {
  // Git can check out JSON with CRLF on Windows; compare the same serialized
  // document without treating that line-ending conversion as stale data.
  if ((await readFile(target, 'utf8')).replace(/\r\n/g, '\n') !== contents) {
    throw new Error('The iPhone catalog is out of date. Run npm run sync:ios-data.');
  }
} else {
  await mkdir(new URL('.', target), { recursive: true });
  await writeFile(target, contents);
}
console.log(`iPhone catalog: ${catalog.venues.length} venues, ${catalog.venues.reduce((total, venue) => total + venue.beers.length, 0)} servings; research checked ${catalog.checkedAt}.`);
