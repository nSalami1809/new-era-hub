import { formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrderStatusTimeline({ history }: { history: Order["history"] }) {
  if (history.length === 0) return null;
  return (
    <ol>
      {history.map((h, i) => {
        const isLast = i === history.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[4px] top-3 h-full w-px bg-border"
                aria-hidden="true"
              />
            )}
            <span
              className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 border ${
                isLast ? "border-success bg-success" : "border-border-strong bg-background"
              }`}
              aria-hidden="true"
            />
            <div>
              <div
                className={`text-sm font-medium ${isLast ? "text-foreground" : "text-muted-foreground"}`}
              >
                {h.status}
              </div>
              <div className="text-xs text-muted-foreground">{formatDate(h.at)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
