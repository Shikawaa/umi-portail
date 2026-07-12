import { getAppEnv } from '@/lib/env';

/**
 * Fixed, non-interactive environment indicator shown on every page when the
 * portal runs against a non-production backend (NEXT_PUBLIC_APP_ENV set to
 * something other than "production"). Amber on purpose: it must stand out from
 * the sober teal UI so staging is never mistaken for production. pointer-events
 * are disabled so it can never block a control underneath it.
 */
export function EnvBadge() {
  const env = getAppEnv();
  if (!env) return null;

  return (
    <div
      role="status"
      aria-label={`Environnement ${env}`}
      title={`Environnement : ${env}`}
      className="pointer-events-none fixed bottom-3 right-3 z-[60] flex select-none items-center gap-1.5 rounded-md border border-amber-500 bg-amber-400 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-950 shadow-sm"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-950" />
      {env}
    </div>
  );
}
