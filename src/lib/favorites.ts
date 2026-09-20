import { useSyncExternalStore } from "react";

const KEY = "neh241.favorites.v1";

function readInitial(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

let favorites: string[] = readInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch {
    /* quota / private mode */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const empty: string[] = [];

export function useFavorites(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => favorites,
    () => empty,
  );
}

export function isFavorite(productId: string): boolean {
  return favorites.includes(productId);
}

export function toggleFavorite(productId: string) {
  favorites = favorites.includes(productId)
    ? favorites.filter((id) => id !== productId)
    : [...favorites, productId];
  persist();
  emit();
}
