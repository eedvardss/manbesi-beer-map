import {
  requireReviewer,
  sameOrigin,
  readBody,
  priceFailure,
} from '../../../../lib/price-auth';
import { reviewPrice } from '../../../../lib/price-store';
export async function POST(request: Request) {
  try {
    requireReviewer(request);
    sameOrigin(request);
    await reviewPrice(await readBody(request));
    return Response.json(
      { saved: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
