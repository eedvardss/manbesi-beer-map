export const dynamic = 'force-dynamic';

// A database outage makes the app unready, but restarting it cannot repair SQL.
export function GET() {
  return Response.json({ status: 'alive' }, { headers: { 'Cache-Control': 'no-store' } });
}
