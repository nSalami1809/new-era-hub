import { useSyncExternalStore } from "react";

export type Toast = { id: number; message: string; tone: "success" | "error" };

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 0;

export function toast(message: string, tone: Toast["tone"] = "success") {
  const id = ++nextId;
  toasts = [...toasts, { id, message, tone }];
  listeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l());
  }, 3000);
}

const emptyToasts: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => emptyToasts,
  );
}
