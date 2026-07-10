import { headers } from 'next/headers';

/**
 * Resolves the public site origin for building redirect / email links.
 * Prefers NEXT_PUBLIC_SITE_URL, then request headers, then localhost.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  try {
    const h = headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() unavailable outside a request scope.
  }

  return 'http://localhost:3000';
}
