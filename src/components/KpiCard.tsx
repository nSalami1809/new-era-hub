import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

/** Stat card used across admin KPI grids — label + icon header, big value,
 * optional hint line. Square corners (no rounded-*), matching the rest of
 * the admin's cards/buttons, unlike the rounded shadcn/ui card this was
 * adapted from. `to`/`search` are typed loosely (TanStack Router's
 * route-literal typing doesn't survive a generic prop) — every call site
 * passes a real, existing route path. */
export function KpiCard({
  to,
  search,
  icon: Icon,
  label,
  value,
  hint,
  valueClassName,
}: {
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="block border border-border p-4 text-left transition-colors hover:bg-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueClassName ?? ""}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Link>
  );
}
