import { useEffect, useState } from "react";

/** Delays reflecting `value` by `delayMs` of inactivity — used to avoid
 * firing a server request on every keystroke in a search field. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
