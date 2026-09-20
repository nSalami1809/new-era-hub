import { useEffect, useState } from "react";

export type ViewMode = "grid" | "table";

export function useViewMode(storageKey: string, initial: ViewMode = "grid") {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return initial;
    const stored = window.localStorage.getItem(storageKey);
    return stored === "table" || stored === "grid" ? stored : initial;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, view);
  }, [storageKey, view]);

  return [view, setView] as const;
}
