import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminOrders } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/commandes/")({
  component: AdminOrders,
});

function AdminOrders() {
  const { data: orders = [], isLoading } = useAdminOrders();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [query, setQuery] = useState("");

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase().includes(q) ||
      o.customer.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <h1 className="text-2xl">Commandes</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
        <input
          className="field !min-h-[38px] max-w-xs"
          placeholder="N° commande, client, téléphone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="field !min-h-[38px] w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
        >
          <option value="">Tous les statuts</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">N°</th>
                <th className="p-3">Date</th>
                <th className="p-3">Client</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">#{o.orderNumber}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  <td className="p-3">
                    {o.customer.lastName} {o.customer.firstName}
                  </td>
                  <td className="p-3">{o.customer.phone}</td>
                  <td className="p-3 text-right font-semibold">{formatPrice(o.total, currency)}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3 text-right">
                    <Link
                      to="/admin/commandes/$id"
                      params={{ id: o.id }}
                      className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground">Aucune commande trouvée.</p>}
        </div>
      )}
    </div>
  );
}
