import { catalogJson } from '../../catalog';

const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(catalogJson));
const etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}"`;

export function GET(request: Request) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'X-Content-Type-Options': 'nosniff',
    ETag: etag,
  };
  // Compression can weaken an ETag. GET revalidation uses weak comparison
  // and may include several candidate tags (RFC 9110, section 13.1.2).
  const validator = request.headers.get('If-None-Match')?.trim() ?? '';
  const unchanged = validator === '*' || validator.match(/(?:W\/)?"[^"]*"/g)
    ?.some((candidate) => candidate.replace(/^W\//, '') === etag) === true;
  return unchanged
    ? new Response(null, { status: 304, headers })
    : new Response(catalogJson, { headers });
}
