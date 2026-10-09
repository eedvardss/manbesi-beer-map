import {
  requirePrices,
  sameOrigin,
  visitor,
  readBody,
  priceFailure,
} from '../../../../lib/price-auth';
import { submitPrice } from '../../../../lib/price-store';
import { PriceError } from '../../../../lib/price-input';
export async function POST(request: Request) {
  try {
    requirePrices();
    sameOrigin(request);
    const reporter = visitor(request);
    if (!reporter)
      throw new PriceError(401, 'Atver cenas ieteikuma formu vēlreiz.');
    const result = await submitPrice(await readBody(request), reporter);
    return Response.json(result, {
      status: result.duplicate ? 200 : 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return priceFailure(error);
  }
}
