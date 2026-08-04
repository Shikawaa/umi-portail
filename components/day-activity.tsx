import { cn } from '@/lib/utils';
import type { DayBucket } from '@/lib/activity';

/**
 * Vertical bar chart of daily activity. Bars in the current engagement color
 * (`--state-*`, inherited from the `.state-*` container — teal by default),
 * soft stubs for empty days. Optional weekday labels under the columns.
 * Server-renderable (no client hooks) — titles/aria text are precomputed.
 */
export function DayActivity({
  buckets,
  ariaLabel,
  showLabels = false,
  size = 'lg',
  emptyLabel,
}: {
  buckets: DayBucket[];
  ariaLabel: string;
  showLabels?: boolean;
  size?: 'sm' | 'lg';
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  if (total === 0 && emptyLabel) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const barsHeight = size === 'lg' ? 'h-32' : 'h-10';

  return (
    <div role="img" aria-label={ariaLabel}>
      <div className={cn('flex items-end gap-1', barsHeight)}>
        {buckets.map((b, i) => (
          <div
            key={i}
            className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
            >
              {b.title}
            </div>
            <div
              className={cn(
                'w-full rounded-sm transition-colors',
                b.count > 0
                  ? 'bg-state group-hover:bg-state-fg'
                  : 'bg-state-soft group-hover:bg-state-border',
              )}
              style={{
                height: `${(b.count / max) * 100}%`,
                minHeight: b.count > 0 ? '6px' : '3px',
              }}
            />
          </div>
        ))}
      </div>
      {showLabels ? (
        <div className="mt-1.5 flex gap-1">
          {buckets.map((b, i) => (
            <div
              key={i}
              className="min-w-0 flex-1 text-center text-[10px] leading-none text-muted-foreground"
            >
              {b.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
