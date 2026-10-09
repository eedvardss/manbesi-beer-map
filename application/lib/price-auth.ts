import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { databaseConfigured } from './database';
import { PriceError } from './price-input';

export function pricesEnabled() {
  return (
    process.env.PRICE_SUGGESTIONS_ENABLED === 'true' &&
    databaseConfigured() &&
    Boolean(process.env.DATABASE_REVIEW_URL) &&
    (process.env.PRICE_REVIEW_PASSWORD?.length ?? 0) >= 24 &&
    (process.env.PRICE_SESSION_SECRET?.length ?? 0) >= 32
  );
}
export function requirePrices() {
  if (!pricesEnabled())
    throw new PriceError(503, 'Cenu ieteikumi šajā vidē nav pieejami.');
}
function digest(value: string) {
  return createHash('sha256').update(value).digest();
}
export function correctPassword(value: unknown) {
  return (
    typeof value === 'string' &&
    timingSafeEqual(
      digest(value),
      digest(process.env.PRICE_REVIEW_PASSWORD ?? ''),
    )
  );
}
function sign(value: string) {
  return createHmac('sha256', process.env.PRICE_SESSION_SECRET!)
    .update(value)
    .digest('hex');
}
export function sessionToken(
  kind: 'visitor' | 'review',
  id: string = randomUUID(),
) {
  const value = `${kind}.${id}.${Math.floor(Date.now() / 1000)}`;
  return `${value}.${sign(value)}`;
}
function cookie(request: Request, name: string) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
function validToken(token: string | undefined, kind: string, ttl: number) {
  if (!token || token.length > 200) return null;
  const parts = token.split('.');
  if (
    parts.length !== 4 ||
    parts[0] !== kind ||
    !/^\d{10}$/.test(parts[2]) ||
    !/^[0-9a-f]{64}$/.test(parts[3])
  )
    return null;
  const age = Math.floor(Date.now() / 1000) - Number(parts[2]);
  if (age < 0 || age > ttl) return null;
  const value = parts.slice(0, 3).join('.');
  return timingSafeEqual(
    Buffer.from(parts[3], 'hex'),
    Buffer.from(sign(value), 'hex'),
  )
    ? parts[1]
    : null;
}
export function visitor(request: Request) {
  return validToken(cookie(request, 'bm_price_visitor'), 'visitor', 7 * 86400);
}
export function reporterKey(id: string) {
  return sign(`reporter:${id}`);
}
export function requireReviewer(request: Request) {
  requirePrices();
  if (!validToken(cookie(request, 'bm_price_review'), 'review', 3600))
    throw new PriceError(401, 'Nepieciešama pārbaudītāja pieslēgšanās.');
}
function origin(request: Request) {
  const value = new URL(
    process.env.PRICE_ALLOWED_ORIGIN ?? new URL(request.url).origin,
  );
  if (
    value.protocol !== 'https:' &&
    !(
      value.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(value.hostname)
    )
  )
    throw new PriceError(503, 'Cenu ieteikumiem nepieciešams HTTPS.');
  return value;
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== origin(request).origin)
    throw new PriceError(403, 'Pieprasījumam jābūt no šīs vietnes.');
}
export function sessionCookie(
  request: Request,
  name: string,
  token: string,
  seconds: number,
) {
  const path = name === 'bm_price_review' ? '/api/price-review' : '/api/prices';
  const secure = origin(request).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${token}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure}`;
}
export async function readBody(
  request: Request,
  maximum = 4096,
): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new PriceError(415, 'Nepieciešams JSON pieprasījums.');
  const reader = request.body?.getReader();
  if (!reader) throw new PriceError(400, 'Trūkst pieprasījuma datu.');
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new PriceError(413, 'Pieprasījums ir pārāk liels.');
    }
    parts.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(parts).toString());
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new PriceError(400, 'Nederīgi pieprasījuma dati.');
  }
}
export function priceFailure(error: unknown) {
  if (error instanceof PriceError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  const code = (error as { code?: string })?.code;
  const failures: Record<string, [number, string]> = {
    P0400: [400, 'Nederīgs cenas ieteikums.'],
    P0404: [404, 'Cena vai ieteikums nav atrasts.'],
    P0409: [
      409,
      'Cena vai ieteikums jau mainījies. Atjauno datus un pārbaudi vēlreiz.',
    ],
    P0429: [429, 'Pārāk daudz pieprasījumu. Mēģini vēlāk.'],
  };
  const [status, message] = failures[code ?? ''] ?? [
    503,
    'Datus neizdevās saglabāt. Mēģini vēlreiz.',
  ];
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...(status === 429 ? { 'Retry-After': '3600' } : {}),
      },
    },
  );
}
