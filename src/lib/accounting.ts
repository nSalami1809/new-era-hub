import { effectivePrice, type Order, type OrderItem, type Product } from "@/lib/types";

// An order only counts as revenue once money has actually changed hands, not
// while it's still being negotiated. Shared by the dashboard, Comptabilité,
// and the admin low-margin notification check.
export const PAID_STATUSES = ["Payée", "En préparation", "Expédiée", "Livrée"];

export function itemProfit(item: OrderItem): number {
  return (item.unitPrice - item.costPrice) * item.quantity;
}
export function itemRevenue(item: OrderItem): number {
  return item.unitPrice * item.quantity;
}

export type CategoryRow = {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  units: number;
};

/** Revenue/COGS/margin per category, from paid orders' items joined against
 * each product's *current* category (order items don't snapshot category). */
export function computeCategoryRows(
  paidOrders: Order[],
  categoryByProductId: Map<string, string>,
): CategoryRow[] {
  const map = new Map<string, CategoryRow>();
  for (const o of paidOrders) {
    for (const it of o.items) {
      const name =
        (it.productId && categoryByProductId.get(it.productId)) || "Autre / produit supprimé";
      const row = map.get(name) ?? { name, revenue: 0, cogs: 0, profit: 0, margin: 0, units: 0 };
      row.revenue += itemRevenue(it);
      row.cogs += it.costPrice * it.quantity;
      row.units += it.quantity;
      map.set(name, row);
    }
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      profit: r.revenue - r.cogs,
      margin: r.revenue > 0 ? Math.round(((r.revenue - r.cogs) / r.revenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type CategoryStockRow = {
  name: string;
  stockUnits: number;
  stockValue: number;
  potentialProfit: number;
};

/** Current inventory value (at cost) and potential profit per category —
 * a point-in-time balance, not tied to the reporting period. */
export function computeCategoryStockRows(products: Product[]): CategoryStockRow[] {
  const map = new Map<string, CategoryStockRow>();
  for (const p of products) {
    const row = map.get(p.category) ?? {
      name: p.category,
      stockUnits: 0,
      stockValue: 0,
      potentialProfit: 0,
    };
    row.stockUnits += p.stock;
    row.stockValue += p.stock * p.costPrice;
    row.potentialProfit += p.stock * (effectivePrice(p) - p.costPrice);
    map.set(p.category, row);
  }
  return [...map.values()].sort((a, b) => b.stockValue - a.stockValue);
}

export type CategoryFinancials = CategoryRow & CategoryStockRow;

/** Joins per-category sales (period-scoped) with per-category current stock
 * value (not period-scoped) into one row per category seen in either. */
export function mergeCategoryFinancials(
  salesRows: CategoryRow[],
  stockRows: CategoryStockRow[],
): CategoryFinancials[] {
  const map = new Map<string, CategoryFinancials>();
  for (const r of salesRows) {
    map.set(r.name, { ...r, stockUnits: 0, stockValue: 0, potentialProfit: 0 });
  }
  for (const s of stockRows) {
    const existing = map.get(s.name);
    if (existing) {
      existing.stockUnits = s.stockUnits;
      existing.stockValue = s.stockValue;
      existing.potentialProfit = s.potentialProfit;
    } else {
      map.set(s.name, { revenue: 0, cogs: 0, profit: 0, margin: 0, units: 0, ...s });
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.stockValue - a.stockValue);
}
