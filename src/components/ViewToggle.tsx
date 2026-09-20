import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "@/lib/use-view-mode";

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex border border-border-strong"
      role="group"
      aria-label="Mode d'affichage"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        title="Vue en grille"
        className={`flex h-11 w-11 items-center justify-center transition-colors sm:h-9 sm:w-9 ${
          view === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <LayoutGrid size={16} />
        <span className="sr-only">Vue en grille</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={view === "table"}
        title="Vue en tableau"
        className={`flex h-11 w-11 items-center justify-center border-l border-border-strong transition-colors sm:h-9 sm:w-9 ${
          view === "table"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <List size={16} />
        <span className="sr-only">Vue en tableau</span>
      </button>
    </div>
  );
}
