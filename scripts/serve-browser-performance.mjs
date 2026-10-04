// Loopback-only diagnostic wrapper for the already-built Worker; no app bundle changes.
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { gzip, gunzip, brotliCompress, brotliDecompress } from 'node:zlib';

const upstreamPort = Number(process.env.BEER_PERF_UPSTREAM_PORT || 3017);
const port = Number(process.env.BEER_PERF_PORT || 3018);
for (const value of [upstreamPort, port]) if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error('Expected an unprivileged loopback port');
if (upstreamPort === port) throw new Error('Diagnostic and upstream ports must differ');
const output = resolve(process.env.BEER_PERF_OUTPUT || 'artifacts/browser-performance');
const token = randomUUID();
const source = (await readFile(new URL('./browser-performance-probe.js', import.meta.url), 'utf8')).replace('__BEER_MAP_PROBE_TOKEN__', token);
const injection = `<script data-beer-map-local-probe>${source}</script>`;
await mkdir(output, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/_beer-map-performance/report') {
      if (request.method !== 'POST' || request.headers['x-beer-map-probe'] !== token || request.headers['content-type'] !== 'application/json') {
        response.writeHead(403); response.end(); return;
      }
      const chunks = []; let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) { response.writeHead(413); response.end(); return; }
        chunks.push(chunk);
      }
      const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!/^[a-z0-9-]{1,80}$/.test(report.label) || report.measurement?.version !== 2) { response.writeHead(400); response.end(); return; }
      const filename = `${report.label}.json`;
      await writeFile(resolve(output, filename), JSON.stringify({ capturedAt: new Date().toISOString(), injectionBytes: Buffer.byteLength(injection), ...report }, null, 2));
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ saved: filename }));
      console.log(`Saved ${filename}`); return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
    const headers = { accept: request.headers.accept || '*/*', 'accept-encoding': request.headers['accept-encoding'] || 'identity' };
    const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: url.pathname + url.search, method: request.method, headers }, async (incoming) => {
      try {
        const outgoingHeaders = { ...incoming.headers };
        delete outgoingHeaders['transfer-encoding'];
        if (request.method === 'GET' && incoming.headers['content-type']?.includes('text/html')) {
          const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
          let body = Buffer.concat(chunks);
          const encoding = incoming.headers['content-encoding'];
          if (encoding === 'gzip') body = await promisify(gunzip)(body);
          if (encoding === 'br') body = await promisify(brotliDecompress)(body);
          if (encoding && encoding !== 'gzip' && encoding !== 'br' && encoding !== 'identity') throw new Error('Unsupported HTML encoding');
          const html = body.toString('utf8');
          if (!html.includes('<head>')) throw new Error('Expected a standalone HTML head');
          body = Buffer.from(html.replace('<head>', `<head>${injection}`));
          if (encoding === 'gzip') body = await promisify(gzip)(body);
          if (encoding === 'br') body = await promisify(brotliCompress)(body);
          outgoingHeaders['content-length'] = body.length;
          outgoingHeaders['cache-control'] = 'no-store';
          delete outgoingHeaders.etag;
          response.writeHead(incoming.statusCode || 200, outgoingHeaders); response.end(body);
        } else {
          response.writeHead(incoming.statusCode || 200, outgoingHeaders); incoming.pipe(response);
        }
      } catch (error) { console.error(error.message); if (!response.headersSent) response.writeHead(502); response.end('Local profiling wrapper failed'); }
    });
    upstream.on('error', (error) => { console.error(error.message); if (!response.headersSent) response.writeHead(502); response.end('Start the local built Worker first'); });
    upstream.end();
  } catch (error) { console.error(error.message); if (!response.headersSent) response.writeHead(400); response.end('Invalid local profiling request'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local production profiling: http://127.0.0.1:${port}/ -> 127.0.0.1:${upstreamPort}; ${Buffer.byteLength(injection)} injected bytes; reports ${output}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
