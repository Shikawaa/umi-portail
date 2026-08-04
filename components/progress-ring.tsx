/**
 * Simple donut progress ring (SVG). Arc in the current engagement color
 * (`--state-*`, inherited from the `.state-*` container) over a soft track,
 * value in the center. Server-renderable. Used on the patient fiche to show
 * library coverage (distinct exercises explored / total).
 */
export function ProgressRing({
  value,
  total,
  size = 60,
  strokeWidth = 6,
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const dash = circumference * pct;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${value} / ${total}`}
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="hsl(var(--state-soft))"
        strokeWidth={strokeWidth}
      />
      {/* At 0 the rounded cap would still paint a dot: draw nothing instead. */}
      {dash > 0 ? (
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="hsl(var(--state))"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="hsl(var(--state-fg))"
        style={{ fontSize: size * 0.3, fontWeight: 600 }}
      >
        {value}
      </text>
    </svg>
  );
}
