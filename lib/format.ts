// Locale-aware formatting helpers (Intl).

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string,
): string | null {
  const d = toDate(value);
  if (!d) return null;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: string,
): string | null {
  const d = toDate(value);
  if (!d) return null;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Relative day label based on the calendar-day difference from today.
 * Uses `numeric: 'auto'` so it yields "aujourd'hui" / "hier" / "il y a 2 jours".
 */
export function formatRelativeDay(
  value: string | Date | null | undefined,
  locale: string,
): string | null {
  const d = toDate(value);
  if (!d) return null;
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round(
    (startOf(d).getTime() - startOf(new Date()).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    diffDays,
    'day',
  );
}
