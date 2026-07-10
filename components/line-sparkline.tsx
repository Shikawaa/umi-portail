import { cn } from '@/lib/utils';

/**
 * Small line sparkline (SVG) connecting one point per day. Teal line + dots,
 * light baseline. Server-renderable — per-point hover titles are precomputed.
 * Sized to a fixed 112x40 box so dots stay round (matches a w-28 h-10 slot).
 */
export function LineSparkline({
  values,
  ariaLabel,
  titles,
  className,
}: {
  values: number[];
  ariaLabel: string;
  titles?: string[];
  className?: string;
}) {
  const W = 112;
  const H = 40;
  const PAD = 5;
  const n = values.length;
  const max = Math.max(1, ...values);

  const xAt = (i: number) =>
    n <= 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1);
  const yAt = (v: number) => H - PAD - (v / max) * (H - 2 * PAD);

  const points = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={ariaLabel}
      className={cn('block', className)}
    >
      <line
        x1={PAD}
        y1={H - PAD}
        x2={W - PAD}
        y2={H - PAD}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.2} fill="hsl(var(--primary))">
          {titles?.[i] ? <title>{titles[i]}</title> : null}
        </circle>
      ))}
    </svg>
  );
}
