import app from 'vinext/server/fetch-handler';
import { clerkDevelopmentConfig } from './lib/clerk-config';

// Apply these after rendering so cached pages and API/error responses agree.
export default {
  ...app,
  async fetch(request: Request, env: unknown, context: ExecutionContext) {
    // Aluskarte was taken offline at the owner's request. Keep local development
    // available, but serve no app, API or assets on either public hostname.
    const hostname = new URL(request.url).hostname;
    if (hostname === 'aluskarte.lv' || hostname === 'www.aluskarte.lv') {
      return new Response('', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    const response = await app.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://tiles.openfreemap.org; font-src https://tiles.openfreemap.org; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (new URL(request.url).pathname === '/admin') {
      headers.set('Cache-Control', 'no-store');
      const config = clerkDevelopmentConfig();
      if (config) {
        const domain = Buffer.from(config.publishableKey.slice('pk_test_'.length), 'base64').toString().replace(/\$$/, '');
        if (/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(domain)) {
          const clerkOrigin = `https://${domain}`;
          headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline' ${clerkOrigin} https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.clerk.com ${clerkOrigin}; connect-src 'self' ${clerkOrigin} https://challenges.cloudflare.com; font-src 'self'; frame-src ${clerkOrigin} https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`);
        }
      }
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
