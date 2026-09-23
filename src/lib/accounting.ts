import type { Order, OrderItem } from "@/lib/types";

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
