import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHistoryNav } from "@/lib/use-history-nav";

/**
 * Floating back/forward buttons, mobile-only: the OS back gesture isn't
 * always available or obvious (installed PWA, in-app browsers), and there's
 * no equivalent affordance for "forward" at all. Mounted once in
 * SiteLayout, so it follows the user across every storefront page.
 */
export function MobileHistoryNav() {
  const { canGoBack, canGoForward, goBack, goForward } = useHistoryNav();

  if (!canGoBack && !canGoForward) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-between px-4 sm:hidden">
      <button
        type="button"
        onClick={goBack}
        aria-label="Page précédente"
        className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-foreground shadow-lg transition-opacity ${
          canGoBack ? "" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={goForward}
        aria-label="Page suivante"
        className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-foreground shadow-lg transition-opacity ${
          canGoForward ? "" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
