export function clerkDevelopmentConfig() {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  const value = process.env.PRICE_ALLOWED_ORIGIN;
  if (
    !publishableKey?.startsWith('pk_test_') ||
    !secretKey?.startsWith('sk_test_') ||
    !value
  )
    return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.username ||
      url.password ||
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        ))
    )
      return null;
    return { publishableKey, secretKey, origin: value };
  } catch {
    return null;
  }
}
