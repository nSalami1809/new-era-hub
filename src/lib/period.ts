// Shared date-range picker logic for admin reporting pages (Comptabilité,
// Dépenses, ...) — one definition so "ce mois-ci" etc. means the same thing
// everywhere.
export const PERIODS = [
  { key: "7j", label: "7 derniers jours" },
  { key: "30j", label: "30 derniers jours" },
  { key: "mois", label: "Ce mois-ci" },
  { key: "mois-dernier", label: "Mois dernier" },
  { key: "annee", label: "Cette année" },
  { key: "tout", label: "Depuis le début" },
  { key: "custom", label: "Période personnalisée" },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

/** Parses a plain `date` column ("2026-09-23", no time) as a LOCAL calendar
 * date — `new Date(isoDate)` would parse it as UTC midnight instead, which
 * can shift it to the previous local day west of UTC. */
export function parseDateOnly(isoDate: string): Date {
  const parts = isoDate.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d);
}

export function periodRange(key: PeriodKey, from: string, to: string): { start: Date; end: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (key) {
    case "7j": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "30j": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case "mois":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "mois-dernier": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "annee":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    case "tout":
      return { start: new Date(2000, 0, 1), end: endOfDay(now) };
    case "custom": {
      const start = from ? startOfDay(new Date(from)) : new Date(2000, 0, 1);
      const end = to ? endOfDay(new Date(to)) : endOfDay(now);
      return { start, end };
    }
  }
}
