import { requireReviewer, priceFailure } from '../../../../lib/price-auth';
import { reviewList } from '../../../../lib/price-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    requireReviewer(request);
    return Response.json(
      { suggestions: await reviewList() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
