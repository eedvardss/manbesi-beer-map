import pg from 'pg';
import { database } from './database';
import {
  PriceError,
  uuidPattern,
  parsePrice,
  evidenceUrl,
  observedDate,
} from './price-input';
import { reporterKey } from './price-auth';

let reviewerPool: pg.Pool | undefined;
export function reviewDatabase() {
  if (!process.env.DATABASE_REVIEW_URL)
    throw new PriceError(503, 'Pārbaudītāja datubāze nav konfigurēta.');
  reviewerPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_REVIEW_URL,
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    idleTimeoutMillis: 30000,
  });
  if (reviewerPool.listenerCount('error') === 0)
    reviewerPool.on('error', () =>
      console.error('Reviewer database connection failed'),
    );
  return reviewerPool;
}
export async function closeReviewDatabase() {
  const current = reviewerPool;
  reviewerPool = undefined;
  await current?.end();
}
export function id(value: unknown) {
  if (typeof value !== 'string' || !uuidPattern.test(value))
    throw new PriceError(400, 'Nederīgs identifikators.');
  return value;
}
export function version(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 2147483646
  )
    throw new PriceError(400, 'Nederīga cenas versija.');
  return value;
}
export async function submitPrice(
  body: Record<string, unknown>,
  visitorId: string,
) {
  const note = body.note ?? '';
  if (typeof note !== 'string' || note.length > 500)
    throw new PriceError(400, 'Piezīme nedrīkst pārsniegt 500 rakstzīmes.');
  const source = body.evidenceUrl ? evidenceUrl(body.evidenceUrl) : '';
  const { rows } = await database().query<{
    result: { id: string; status: string; duplicate: boolean };
  }>('SELECT beer_map_submit_price($1,$2,$3,$4,$5,$6,$7) AS result', [
    id(body.servingId),
    parsePrice(body.price),
    version(body.revision),
    reporterKey(visitorId),
    id(body.requestId),
    note,
    source,
  ]);
  return rows[0].result;
}
export async function reviewPrice(body: Record<string, unknown>) {
  const actor = (process.env.PRICE_REVIEWER_NAME ?? 'operator').slice(0, 80);
  if (body.action === 'revert') {
    await reviewDatabase().query('SELECT beer_map_revert_price($1,$2,$3)', [
      id(body.servingId),
      version(body.revision),
      actor,
    ]);
    return;
  }
  if (body.action !== 'approve' && body.action !== 'reject')
    throw new PriceError(400, 'Nederīga darbība.');
  await reviewDatabase().query('SELECT beer_map_review_price($1,$2,$3,$4,$5)', [
    id(body.id),
    body.action,
    body.action === 'approve' ? evidenceUrl(body.evidenceUrl) : '',
    body.action === 'approve' ? observedDate(body.observedOn) : null,
    actor,
  ]);
}
export async function reviewList(
  view = 'pending',
  cursor: string | null = null,
  search = '',
) {
  if (!['pending', 'history'].includes(view) || search.length > 100)
    throw new PriceError(400, 'Nederīgs ieteikumu filtrs.');
  let beforeDate: string | null = null;
  let beforeId: string | null = null;
  if (cursor) {
    try {
      if (cursor.length > 200) throw new Error();
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString(),
      ) as unknown;
      if (
        !Array.isArray(decoded) ||
        decoded.length !== 2 ||
        typeof decoded[0] !== 'string' ||
        typeof decoded[1] !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T/.test(decoded[0]) ||
        !Number.isFinite(Date.parse(decoded[0]))
      )
        throw new Error();
      beforeDate = decoded[0];
      beforeId = id(decoded[1]);
    } catch {
      throw new PriceError(400, 'Nederīga saraksta lapa.');
    }
  }
  const { rows } = await reviewDatabase().query(
    `WITH selected AS (
    SELECT p.id,p.serving_id AS "servingId",s.venue_name AS "venueName",s.beer_name AS "beerName",
    s.volume_ml AS "volumeMl",s.package_count AS "packageCount",p.old_cents AS "oldCents",p.proposed_cents AS "proposedCents",
    s.price_is_from AS "priceIsFrom",
    p.note,p.evidence_url AS "evidenceUrl",p.status,p.created_at AS "createdAt",s.version AS revision,
    coalesce(c.price_cents,s.baseline_cents) AS "currentCents",
    (s.active AND p.expected_version=s.version) AS actionable,
    (c.suggestion_id=p.id) AS "canRevert"
    FROM beer_map_price_suggestions p JOIN beer_map_servings s ON s.id=p.serving_id
    LEFT JOIN beer_map_current_prices c ON c.serving_id=s.id
    WHERE CASE WHEN $1='pending' THEN p.status='pending' ELSE p.status<>'pending' END
      AND ($2::timestamptz IS NULL OR (p.created_at,p.id)<($2::timestamptz,$3::uuid))
      AND (strpos(lower(s.venue_name),lower($4))>0 OR strpos(lower(s.beer_name),lower($4))>0)
    ORDER BY p.created_at DESC,p.id DESC LIMIT 26
    ) SELECT coalesce((SELECT json_agg(selected ORDER BY "createdAt" DESC,id DESC) FROM selected),'[]'::json) AS suggestions,
      (SELECT json_build_object('pending',count(*) FILTER(WHERE status='pending'),
       'approved',count(*) FILTER(WHERE status='approved'),'rejected',count(*) FILTER(WHERE status='rejected')) FROM beer_map_price_suggestions) AS counts`,
    [view, beforeDate, beforeId, search],
  );
  const result = rows[0] as {
    suggestions: { id: string; createdAt: string }[];
    counts: { pending: number; approved: number; rejected: number };
  };
  const more = result.suggestions.length > 25;
  const suggestions = result.suggestions.slice(0, 25);
  const last = suggestions.at(-1);
  return {
    suggestions,
    counts: result.counts,
    nextCursor:
      more && last
        ? Buffer.from(JSON.stringify([last.createdAt, last.id])).toString(
            'base64url',
          )
        : null,
  };
}
