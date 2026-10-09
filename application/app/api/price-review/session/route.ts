import {
  requirePrices,
  sameOrigin,
  readBody,
  correctPassword,
  sessionToken,
  sessionCookie,
  priceFailure,
} from '../../../../lib/price-auth';
import { reviewDatabase } from '../../../../lib/price-store';
import { PriceError } from '../../../../lib/price-input';
export async function POST(request: Request) {
  try {
    requirePrices();
    sameOrigin(request);
    const body = await readBody(request, 1024);
    await reviewDatabase().query('SELECT beer_map_price_login_limit()');
    if (!correctPassword(body.password))
      throw new PriceError(401, 'Nepareiza pārbaudītāja parole.');
    return Response.json(
      { authenticated: true },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': sessionCookie(
            request,
            'bm_price_review',
            sessionToken('review'),
            3600,
          ),
        },
      },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    return Response.json(
      { authenticated: false },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': sessionCookie(request, 'bm_price_review', '', 0),
        },
      },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
