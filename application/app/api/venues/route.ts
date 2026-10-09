import { readCatalogJson } from '../../../lib/catalog-store';
import { pricesEnabled } from '../../../lib/price-auth';

export const dynamic = 'force-dynamic';
let previousJson: string | undefined;
let previousEtag: string | undefined;

export async function GET(request: Request) {
  let catalogJson: string;
  try {
    catalogJson = await readCatalogJson();
  } catch {
    return Response.json(
      { error: 'Catalog temporarily unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
      },
    );
  }
  let etag = previousEtag;
  if (catalogJson !== previousJson || !etag) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(catalogJson),
    );
    etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}"`;
    previousJson = catalogJson;
    previousEtag = etag;
  }
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, no-cache',
    'X-Price-Suggestions': pricesEnabled() ? 'enabled' : 'disabled',
    'X-Content-Type-Options': 'nosniff',
    ETag: etag,
  };
  // Compression can weaken an ETag. GET revalidation uses weak comparison
  // and may include several candidate tags (RFC 9110, section 13.1.2).
  const validator = request.headers.get('If-None-Match')?.trim() ?? '';
  const unchanged =
    validator === '*' ||
    validator
      .match(/(?:W\/)?"[^"]*"/g)
      ?.some((candidate) => candidate.replace(/^W\//, '') === etag) === true;
  return unchanged
    ? new Response(null, { status: 304, headers })
    : new Response(catalogJson, { headers });
}
