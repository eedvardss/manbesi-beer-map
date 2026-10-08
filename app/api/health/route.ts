import { catalogReady } from '../../../lib/catalog-store';
import { databaseConfigured } from '../../../lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!await catalogReady()) throw new Error('Catalog missing');
    return Response.json({ status: 'ok', catalog: databaseConfigured() ? 'postgres' : 'file' }, { headers });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers });
  }
}
