import { sameOrigin, readBody, priceFailure } from '../../../../lib/price-auth';
import { requireReviewer } from '../../../../lib/admin-auth';
import { reviewPrice } from '../../../../lib/price-store';
export async function POST(request: Request) {
  try {
    const actor = await requireReviewer(request, true);
    sameOrigin(request);
    await reviewPrice(await readBody(request), actor);
    return Response.json(
      { saved: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
