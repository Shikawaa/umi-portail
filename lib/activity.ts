// Daily activity helpers — turn a list of completion timestamps into a fixed
// window of per-day buckets (oldest to newest), used by the dashboard mini
// sparkline (7 days) and the patient detail chart (14 days).

export interface DayBucket {
  /** Number of completions on that day. */
  count: number;
  /** Short label shown under the column (locale-aware weekday initial). */
  label: string;
  /** Accessible / hover title, e.g. "mardi 8 juillet : 3 exercices". */
  title: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build `days` buckets ending today (last item = today).
 * @param dates      completion timestamps (ISO strings)
 * @param days       window size (e.g. 7 or 14)
 * @param locale     locale for weekday / date formatting
 * @param titleFor   optional builder for the per-day title (date label + count)
 */
export function buildDailyBuckets(
  dates: (string | null | undefined)[],
  days: number,
  locale: string,
  titleFor?: (dateLabel: string, count: number) => string,
): DayBucket[] {
  const today = startOfDay(new Date());
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const full = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const dayDates: Date[] = [];
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayDate = new Date(today.getTime() - i * DAY_MS);
    dayDates.push(dayDate);
    buckets.push({ count: 0, label: narrow.format(dayDate), title: '' });
  }

  for (const value of dates) {
    if (!value) continue;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) continue;
    const diff = Math.round(
      (startOfDay(d).getTime() - today.getTime()) / DAY_MS,
    ); // <= 0 for the recent window
    const idx = days - 1 + diff;
    if (idx >= 0 && idx < days) buckets[idx].count += 1;
  }

  for (let i = 0; i < buckets.length; i++) {
    const dateLabel = full.format(dayDates[i]);
    buckets[i].title = titleFor
      ? titleFor(dateLabel, buckets[i].count)
      : dateLabel;
  }

  return buckets;
}
