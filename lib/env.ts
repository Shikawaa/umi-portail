/**
 * Non-production environment label, or null on production.
 *
 * Driven by NEXT_PUBLIC_APP_ENV (inlined at build time). Unset or "production"
 * => null (no indicator). Anything else (e.g. "staging") is surfaced as an
 * environment badge. Default-off on purpose: production must never show a
 * badge, so the danger case (thinking prod is staging) can't happen silently.
 */
export function getAppEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_ENV?.trim();
  if (!raw || raw.toLowerCase() === 'production') return null;
  return raw;
}
