import {
  requirePrices,
  visitor,
  sessionToken,
  sessionCookie,
  priceFailure,
} from '../../../../lib/price-auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    requirePrices();
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (!visitor(request))
      headers['Set-Cookie'] = sessionCookie(
        request,
        'bm_price_visitor',
        sessionToken('visitor'),
        7 * 86400,
      );
    return Response.json({ enabled: true, publication: 'review' }, { headers });
  } catch (error) {
    return priceFailure(error);
  }
}
