import { useEffect, useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendAreaPoint = { label: string; primary: number; secondary?: number };

/** Square-cornered tooltip matching the app's own card style (border +
 * background, no rounding) — Recharts' default tooltip can't be restyled
 * via className alone, so this replaces it entirely via `content`. Typed
 * loosely against what Recharts actually injects at render time (active +
 * payload[].payload) rather than its own TooltipProps generic, whose shape
 * doesn't line up cleanly with a custom content component in Recharts 3. */
function ChartTooltip({
  active,
  payload,
  valueFormatter,
  primaryLabel,
  secondaryLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TrendAreaPoint }>;
  valueFormatter: (value: number) => string;
  primaryLabel: string;
  secondaryLabel?: string | undefined;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-muted-foreground">{point.label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="size-2 bg-foreground" aria-hidden="true" />
        <span className="font-semibold">{valueFormatter(point.primary)}</span>
        <span className="text-muted-foreground">{primaryLabel}</span>
      </div>
      {point.secondary !== undefined && secondaryLabel && (
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="size-2 border border-foreground" aria-hidden="true" />
          <span className="font-semibold">{valueFormatter(point.secondary)}</span>
          <span className="text-muted-foreground">{secondaryLabel}</span>
        </div>
      )}
    </div>
  );
}

/** Revenue (filled area) with an optional second series (dashed outline
 * only, no fill) — two series separate by form, not color alone, so both
 * stay legible for colorblind readers and in both themes. Recharts needs a
 * measured container, which doesn't exist during SSR, so this renders a
 * plain placeholder block until mounted client-side. */
export function TrendAreaChart({
  data,
  primaryLabel,
  secondaryLabel,
  valueFormatter = (v) => String(v),
  height = 260,
}: {
  data: TrendAreaPoint[];
  primaryLabel: string;
  secondaryLabel?: string | undefined;
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="bg-muted" style={{ height }} aria-hidden="true" />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={valueFormatter}
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
              />
            }
            cursor={{ stroke: "var(--color-border-strong)" }}
          />
          <Area
            dataKey="primary"
            type="monotone"
            stroke="var(--color-foreground)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
          {secondaryLabel && (
            <Area
              dataKey="secondary"
              type="monotone"
              stroke="var(--color-foreground)"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {secondaryLabel && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 bg-foreground" aria-hidden="true" />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 border border-foreground" aria-hidden="true" />
            {secondaryLabel}
          </span>
        </div>
      )}
    </div>
  );
}
