import { priceFailure } from '../../../../lib/price-auth';
import { requireReviewer } from '../../../../lib/admin-auth';
import { reviewList } from '../../../../lib/price-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await requireReviewer(request);
    const query = new URL(request.url).searchParams;
    return Response.json(
      await reviewList(
        query.get('view') ?? 'pending',
        query.get('cursor'),
        query.get('search') ?? '',
      ),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return priceFailure(error);
  }
}
