import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import { Pager } from "@/components/Pager";
import { AdminCardGridSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  fetchAllMatchingAdminOrders,
  usePaginatedAdminOrders,
  type AdminOrderFilters,
} from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { useViewMode } from "@/lib/use-view-mode";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/commandes/")({
  component: AdminOrders,
});

function AdminOrders() {
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [view, setView] = useViewMode("admin-orders-view");
  const [page, setPage] = useState(0);
  const [exportingCsv, setExportingCsv] = useState(false);

  const filters: AdminOrderFilters = {
    q: debouncedQuery || undefined,
    status: statusFilter || undefined,
  };

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, statusFilter]);

  const { data, isLoading, isFetching } = usePaginatedAdminOrders(filters, page);
  const orders = data?.rows ?? [];
  const total = data?.total ?? 0;

  async function exportCsv() {
    setExportingCsv(true);
    try {
      const all = await fetchAllMatchingAdminOrders(filters);
      downloadCsv(
        `commandes-${new Date().toISOString().slice(0, 10)}.csv`,
        ["N°", "Date", "Client", "Téléphone", "Sous-total", "Réduction", "Total", "Statut"],
        all.map((o) => [
          o.orderNumber,
          formatDate(o.createdAt),
          `${o.customer.lastName} ${o.customer.firstName}`,
          o.customer.phone,
          o.subtotal,
          o.discount,
          o.total,
          o.status,
        ]),
      );
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Commandes</h1>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exportingCsv}
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          >
            <Download size={14} />
            {exportingCsv ? "Export..." : "Exporter CSV"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
        <input
          className="field !min-h-[38px] w-full sm:w-auto sm:max-w-xs"
          placeholder="N° commande, client, téléphone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="field !min-h-[38px] w-full sm:w-auto"
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
        <div className="mt-4">
          {view === "grid" ? (
            <AdminCardGridSkeleton />
          ) : (
            <div className="overflow-x-auto border border-border">
              <AdminTableSkeleton cols={7} />
            </div>
          )}
        </div>
      ) : orders.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucune commande trouvée.
        </p>
      ) : view === "grid" ? (
        <div
          className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-60" : ""}`}
        >
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">#{o.orderNumber}</span>
                <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm">
                {o.customer.lastName} {o.customer.firstName}
              </div>
              <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold">{formatPrice(o.total, currency)}</span>
                <span>{o.status}</span>
              </div>
              {o.channel === "offline" && (
                <span className="mt-1 inline-block w-fit bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Hors site
                </span>
              )}
              <Link
                to="/nehub-53ff1f11/commandes/$id"
                params={{ id: o.id }}
                className="btn-base btn-outline !min-h-9 mt-3 !px-2.5 !py-1.5 text-xs"
              >
                Détail
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`mt-4 overflow-x-auto border border-border ${isFetching ? "opacity-60" : ""}`}
        >
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
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">#{o.orderNumber}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  <td className="p-3">
                    {o.customer.lastName} {o.customer.firstName}
                  </td>
                  <td className="p-3">{o.customer.phone}</td>
                  <td className="p-3 text-right font-semibold">{formatPrice(o.total, currency)}</td>
                  <td className="p-3">
                    {o.status}
                    {o.channel === "offline" && (
                      <span className="ml-1.5 bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Hors site
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to="/nehub-53ff1f11/commandes/$id"
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
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <Pager page={page} pageSize={ADMIN_ORDERS_PAGE_SIZE} total={total} onPageChange={setPage} />
      )}
    </div>
  );
}
