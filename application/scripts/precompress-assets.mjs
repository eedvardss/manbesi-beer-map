import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.(?:js|css|svg|json)$/.test(entry.name)) files.push(path);
  }
}
await collect('dist/client');
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    const bytes = await readFile(file);
    const [br, gz] = await Promise.all([
      compressBrotli(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }),
      compressGzip(bytes, { level: 9 }),
    ]);
    if (br.length < bytes.length) await writeFile(`${file}.br`, br);
    if (gz.length < bytes.length) await writeFile(`${file}.gz`, gz);
  }
}));
console.log(`Prepared compressed variants for ${files.length} static assets.`);
