import { useId, useState } from "react";

export type TrendPoint = { label: string; value: number };

const CHART_WIDTH = 800;
const CHART_HEIGHT = 240;
const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const TICK_COUNT = 4;

/** "Nice numbers for graph labels" (Paul Heckbert) — picks a round axis max
 * and step (1/2/5 × a power of ten) instead of an arbitrary fraction of the
 * data max, so the y-axis reads 0/50/100/150/200 rather than 0/43/86/... */
function niceNumber(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

function niceScale(maxValue: number, tickCount: number) {
  const safeMax = Math.max(maxValue, 1);
  const step = niceNumber(safeMax / (tickCount - 1), true);
  const niceMax = Math.ceil(safeMax / step) * step;
  return { niceMax, step };
}

/** Line + area chart with a proper y-axis scale (nice round ticks + dashed
 * gridlines) and thinned x-axis date labels — an SVG built by hand (no
 * charting library) so the dashboard's trend chart stays a tiny, lazily
 * unnecessary dependency-free chunk. Linear interpolation between points,
 * matching how the underlying data is already bucketed (daily/monthly),
 * not a smoothed curve that would imply precision the data doesn't have. */
export function TrendChart({
  data,
  valueFormatter = (v) => String(v),
}: {
  data: TrendPoint[];
  valueFormatter?: (value: number) => string;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const chartHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const { niceMax, step } = niceScale(maxValue, TICK_COUNT + 1);
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => i * step).filter(
    (t) => t <= niceMax,
  );

  const xFor = (i: number) =>
    PAD_LEFT + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
  const yFor = (v: number) => PAD_TOP + chartHeight - (v / niceMax) * chartHeight;

  const points = data.map((d, i) => [xFor(i), yFor(d.value)] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const baseline = PAD_TOP + chartHeight;
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]![0]} ${baseline} L ${points[0]![0]} ${baseline} Z`
      : "";

  // At most ~6 x-axis labels regardless of how many points there are, so
  // dates never overlap — show every Nth point, always including the last.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach(([x], i) => {
      const dist = Math.abs(x - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full text-foreground"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--color-foreground)" }} stopOpacity={0.16} />
            <stop offset="100%" style={{ stopColor: "var(--color-foreground)" }} stopOpacity={0} />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = yFor(t);
          return (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={CHART_WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray="4 4"
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {valueFormatter(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={d.label + i}
              x={xFor(i)}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {d.label}
            </text>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path d={linePath} fill="none" className="stroke-foreground" strokeWidth={2} />
        )}

        {hoveredPoint && (
          <>
            <line
              x1={hoveredPoint[0]}
              x2={hoveredPoint[0]}
              y1={PAD_TOP}
              y2={baseline}
              className="stroke-border-strong"
            />
            <circle cx={hoveredPoint[0]} cy={hoveredPoint[1]} r={4} className="fill-foreground" />
          </>
        )}
      </svg>

      {hovered && hoveredPoint && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `${(hoveredPoint[0] / CHART_WIDTH) * 100}%`,
            top: `${(hoveredPoint[1] / CHART_HEIGHT) * 100}%`,
            marginTop: "-2.75rem",
          }}
        >
          <div className="font-semibold">{valueFormatter(hovered.value)}</div>
          <div className="text-muted-foreground">{hovered.label}</div>
        </div>
      )}
    </div>
  );
}
