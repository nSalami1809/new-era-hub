import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; to?: string };

/**
 * Shared storefront breadcrumb. Previously each page hand-rolled its own
 * "Accueil / Boutique / X" as plain text — a muted-gray "/" between plain
 * links reads as inert text on first glance, especially on mobile where
 * there's no hover state to reveal it's clickable. This gives every link a
 * visible-at-rest underline and a tap-friendly background on hover/press,
 * and swaps the "/" for a chevron (the near-universal breadcrumb affordance)
 * — all within the site's existing monochrome palette, no new color added.
 */
export function Breadcrumb({
  items,
  className = "mb-4",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex flex-wrap items-center text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center">
              {i > 0 && (
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="mx-0.5 shrink-0 text-muted-foreground/40"
                />
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="-mx-1.5 rounded-md px-1.5 py-1 text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:bg-muted hover:text-foreground hover:decoration-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate px-1.5 py-1 font-medium text-foreground"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
