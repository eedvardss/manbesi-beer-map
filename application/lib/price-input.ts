export class PriceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parsePrice(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim())
  ) {
    throw new PriceError(
      400,
      'Ievadi cenu ar ne vairāk kā divām zīmēm aiz komata.',
    );
  }
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents < 1 || cents > 50000)
    throw new PriceError(400, 'Cena jānorāda no 0,01 līdz 500,00 EUR.');
  return cents;
}
export function evidenceUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 1000)
    throw new PriceError(400, 'Norādi cenu avota saiti.');
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.href;
  } catch {
    throw new PriceError(
      400,
      'Cenu avotam nepieciešama derīga http vai https saite.',
    );
  }
}
export function observedDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new PriceError(400, 'Norādi pārbaudes datumu.');
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value ||
    value > new Date().toISOString().slice(0, 10)
  ) {
    throw new PriceError(
      400,
      'Pārbaudes datums nevar būt nederīgs vai nākotnē.',
    );
  }
  return value;
}
