import { useEffect, useState } from "react";

/** Persists a string value to localStorage under `storageKey` — same
 * mechanism as useViewMode, generalized. Used for filters that should
 * survive navigating away and back (e.g. editing a product, or creating a
 * new one, remounts the list page and would otherwise silently reset any
 * local-state filter back to its default). */
export function usePersistedState(storageKey: string, initial = "") {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return initial;
    return window.localStorage.getItem(storageKey) ?? initial;
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, value);
  }, [storageKey, value]);

  return [value, setValue] as const;
}
