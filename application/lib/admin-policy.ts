import { PriceError } from './price-input';

// Only call this with claims whose signature and instance were verified by Clerk.
export function requireAdminFactors(
  claims: { fva?: unknown; sts?: unknown },
  recent = false,
) {
  const ages = claims.fva;
  if (
    claims.sts === 'pending' ||
    !Array.isArray(ages) ||
    ages.length !== 2 ||
    !ages.every((age) => Number.isSafeInteger(age) && age >= 0)
  ) {
    throw new PriceError(
      403,
      'Pabeidz divfaktoru autentifikāciju administratora kontā.',
    );
  }
  if (recent && ages.some((age) => age >= 10)) {
    throw new PriceError(
      403,
      'Pirms cenu maiņas pieslēdzies vēlreiz ar paroli un autentifikatora kodu.',
    );
  }
}
