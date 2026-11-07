import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileDown, Trash2 } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import { Pager } from "@/components/Pager";
import { HoldToConfirm } from "@/components/HoldToConfirm";
import { AdminCardGridSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { formatDate, formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { brandedPdfHeader } from "@/lib/pdf-report";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  fetchAllMatchingAdminOrders,
  usePaginatedAdminOrders,
  useDeleteOrder,
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
  const deleteOrder = useDeleteOrder();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [view, setView] = useViewMode("admin-orders-view");
  const [page, setPage] = useState(0);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [toDelete, setToDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const filters: AdminOrderFilters = {
    q: debouncedQuery || undefined,
    status: statusFilter || undefined,
  };

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [debouncedQuery, statusFilter]);

  const { data, isLoading, isFetching } = usePaginatedAdminOrders(filters, page);
  const orders = data?.rows ?? [];
  const total = data?.total ?? 0;

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((s) =>
      orders.every((o) => s.has(o.id)) ? new Set() : new Set(orders.map((o) => o.id)),
    );
  }

  async function selectAllFiltered() {
    setSelectingAll(true);
    try {
      const all = await fetchAllMatchingAdminOrders(filters);
      setSelected(new Set(all.map((o) => o.id)));
    } finally {
      setSelectingAll(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBulkPending(true);
    try {
      await Promise.all(toDelete.ids.map((id) => deleteOrder.mutateAsync(id)));
    } finally {
      setBulkPending(false);
      setSelected(new Set());
      setToDelete(null);
    }
  }

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

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const [{ default: JsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const all = await fetchAllMatchingAdminOrders(filters);
      const doc = new JsPDF();
      const startY = await brandedPdfHeader(
        doc,
        settings,
        "Commandes",
        `${all.length} commande${all.length > 1 ? "s" : ""} · ${new Date().toLocaleDateString("fr-FR")}`,
      );
      autoTable(doc, {
        startY,
        head: [["N°", "Date", "Client", "Téléphone", "Total", "Statut"]],
        body: all.map((o) => [
          o.orderNumber,
          formatDate(o.createdAt),
          `${o.customer.lastName} ${o.customer.firstName}`,
          o.customer.phone,
          formatPrice(o.total, currency),
          o.status,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [23, 23, 23] },
      });
      doc.save(`commandes-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportingPdf(false);
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
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={exportingPdf}
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          >
            {exportingPdf ? <Spinner size={14} /> : <FileDown size={14} />}
            {exportingPdf ? "Export..." : "Exporter PDF"}
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

      {(selected.size > 0 || total > orders.length) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-border bg-muted p-3">
          <span className="text-sm font-medium">
            {selected.size > 0
              ? `${selected.size} commande${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""}`
              : null}
          </span>
          {total > orders.length && (
            <button
              type="button"
              disabled={selectingAll}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => void selectAllFiltered()}
            >
              {selectingAll ? "Récupération..." : `Sélectionner les ${total} résultats du filtre`}
            </button>
          )}
          {selected.size > 0 && (
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                onClick={() =>
                  setToDelete({
                    ids: Array.from(selected),
                    label: `${selected.size} commande${selected.size > 1 ? "s" : ""}`,
                  })
                }
              >
                <Trash2 size={14} />
                Supprimer
              </button>
              <button
                type="button"
                className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                onClick={() => setSelected(new Set())}
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

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
            <div
              key={o.id}
              className={`flex flex-col border p-4 ${selected.has(o.id) ? "border-foreground" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelected(o.id)}
                    aria-label={`Sélectionner ${o.orderNumber}`}
                  />
                  #{o.orderNumber}
                </label>
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
              <div className="mt-3 flex gap-2">
                <Link
                  to="/nehub-53ff1f11/commandes/$id"
                  params={{ id: o.id }}
                  className="btn-base btn-outline !min-h-9 flex-1 !px-2.5 !py-1.5 text-xs"
                >
                  Détail
                </Link>
                <button
                  type="button"
                  className="btn-base btn-danger !min-h-9 !px-2.5 !py-1.5 text-xs"
                  onClick={() => setToDelete({ ids: [o.id], label: `#${o.orderNumber}` })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`mt-4 overflow-x-auto border border-border ${isFetching ? "opacity-60" : ""}`}
        >
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && orders.every((o) => selected.has(o.id))}
                    onChange={toggleSelectPage}
                    aria-label="Tout sélectionner (page affichée)"
                  />
                </th>
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
                <tr
                  key={o.id}
                  className={`border-b border-border last:border-0 ${selected.has(o.id) ? "bg-muted" : ""}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleSelected(o.id)}
                      aria-label={`Sélectionner ${o.orderNumber}`}
                    />
                  </td>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to="/nehub-53ff1f11/commandes/$id"
                        params={{ id: o.id }}
                        className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                      >
                        Détail
                      </Link>
                      <button
                        type="button"
                        className="btn-base btn-danger !min-h-9 !px-2.5 !py-1.5 text-xs"
                        onClick={() => setToDelete({ ids: [o.id], label: `#${o.orderNumber}` })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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

      {toDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-background p-5">
            <h2 className="text-lg">Supprimer {toDelete.label} ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Le stock n'est pas restitué (utilisez "Annuler la commande" pour ça). Maintenez le
              bouton pour confirmer — vous aurez 4 secondes pour revenir en arrière.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={() => setToDelete(null)}
                disabled={bulkPending}
              >
                Annuler
              </button>
              <HoldToConfirm
                onConfirm={confirmDelete}
                idleLabel="Maintenir pour supprimer"
                idleIcon={<Trash2 size={15} />}
                disabled={bulkPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
