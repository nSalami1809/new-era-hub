import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import { AdminCardGridSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { formatDate } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useProducts } from "@/lib/api/products";
import { useAdjustStock, useStockMovements } from "@/lib/api/stock";
import { useAdjustVariantStock } from "@/lib/api/stock-variants";
import { useStockAlerts, useDeleteStockAlert } from "@/lib/api/stock-alerts";
import { useViewMode } from "@/lib/use-view-mode";
import { stockStatus, variantLabel, type ProductVariant } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/stocks")({
  component: AdminStocks,
});

function statusMeta(status: "in" | "low" | "out") {
  const className =
    status === "out" ? "text-destructive" : status === "low" ? "text-warning" : "text-success";
  const label = status === "out" ? "Rupture" : status === "low" ? "Stock faible" : "En stock";
  return { className, label };
}

function VariantStockRow({
  variant,
  colorName,
}: {
  variant: ProductVariant;
  colorName: string | null;
}) {
  const [draft, setDraft] = useState("");
  const adjustVariant = useAdjustVariantStock();
  const label = variantLabel(colorName, variant.size) || "Variante";

  function apply() {
    const newStock = draft === "" ? variant.stock : Math.max(0, Math.round(Number(draft)));
    if (!Number.isFinite(newStock) || newStock === variant.stock) return;
    adjustVariant.mutate({ variantId: variant.id, newStock }, { onSuccess: () => setDraft("") });
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-20 shrink-0 truncate font-medium" title={label}>
        {label}
      </span>
      <span className="w-6 shrink-0 text-muted-foreground">{variant.stock}</span>
      <input
        type="number"
        min={0}
        placeholder="Nouveau"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="field !min-h-8 w-16 flex-1 text-right"
      />
      <button
        type="button"
        disabled={adjustVariant.isPending || !draft}
        onClick={apply}
        className="btn-base btn-outline !min-h-8 !px-2 !py-1 text-xs"
      >
        OK
      </button>
    </div>
  );
}

function AdminStocks() {
  const { data: products = [], isLoading } = useProducts();
  const { data: movements = [] } = useStockMovements();
  const { data: stockAlerts = [] } = useStockAlerts();
  const deleteStockAlert = useDeleteStockAlert();
  const adjustStock = useAdjustStock();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [view, setView] = useViewMode("admin-stocks-view");

  const outOfStock = products.filter((p) => stockStatus(p) === "out").length;
  const lowStock = products.filter((p) => stockStatus(p) === "low").length;

  function apply(productId: string, currentStock: number) {
    const raw = drafts[productId];
    const newStock =
      raw === undefined || raw === "" ? currentStock : Math.max(0, Math.round(Number(raw)));
    if (!Number.isFinite(newStock) || newStock === currentStock) return;
    const reason = reasons[productId]?.trim() || "Ajustement manuel";
    adjustStock.mutate(
      { productId, newStock, reason },
      {
        onSuccess: () => {
          setDrafts((d) => ({ ...d, [productId]: "" }));
          setReasons((r) => ({ ...r, [productId]: "" }));
        },
      },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Stocks</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Produits</div>
          <div className="mt-1 text-xl font-bold">{products.length}</div>
        </div>
        <div className="border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Stock faible</div>
          <div className="mt-1 text-xl font-bold text-warning">{lowStock}</div>
        </div>
        <div className="border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">En rupture</div>
          <div className="mt-1 text-xl font-bold text-destructive">{outOfStock}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6">
          {view === "grid" ? (
            <AdminCardGridSkeleton count={3} />
          ) : (
            <div className="overflow-x-auto border border-border">
              <AdminTableSkeleton cols={6} />
            </div>
          )}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun produit pour le moment. Ajoutez un produit pour pouvoir suivre et ajuster son
            stock.
          </p>
          <Link to="/nehub-53ff1f11/produits/nouveau" className="btn-base btn-success mt-4">
            Nouveau produit
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const status = stockStatus(p);
            const { className: statusClassName, label: statusLabel } = statusMeta(status);
            return (
              <div key={p.id} className="border border-border p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.brand} · {p.sku}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>
                    Stock actuel : <strong>{p.stock}</strong>
                  </span>
                  <span className={statusClassName}>{statusLabel}</span>
                </div>
                {p.variants.length > 0 ? (
                  <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {p.variants.map((v) => (
                      <VariantStockRow
                        key={v.id}
                        variant={v}
                        colorName={p.colors.find((c) => c.id === v.colorId)?.name ?? null}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground">
                        Nouveau stock
                        <input
                          type="number"
                          min={0}
                          className="field !min-h-9 mt-1 w-full text-right"
                          placeholder={String(p.stock)}
                          value={drafts[p.id] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Raison
                        <input
                          type="text"
                          className="field !min-h-9 mt-1 w-full"
                          placeholder="Réassort, inventaire..."
                          value={reasons[p.id] ?? ""}
                          onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="btn-base btn-success !min-h-9 mt-3 w-full !px-3 !py-1.5 text-xs"
                      disabled={adjustStock.isPending || !drafts[p.id]}
                      onClick={() => apply(p.id, p.stock)}
                    >
                      Appliquer
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Produit</th>
                <th className="p-3 text-right">Stock actuel</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Nouveau stock</th>
                <th className="p-3">Raison</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const status = stockStatus(p);
                const { className: statusClassName, label: statusLabel } = statusMeta(status);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.brand} · {p.sku}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{p.stock}</td>
                    <td className="p-3">
                      <span className={statusClassName}>{statusLabel}</span>
                    </td>
                    {p.variants.length > 0 ? (
                      <td className="p-3" colSpan={3}>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {p.variants.map((v) => (
                            <VariantStockRow
                              key={v.id}
                              variant={v}
                              colorName={p.colors.find((c) => c.id === v.colorId)?.name ?? null}
                            />
                          ))}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min={0}
                            className="field !min-h-9 w-24 text-right"
                            placeholder={String(p.stock)}
                            value={drafts[p.id] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="field !min-h-9 w-48"
                            placeholder="Réassort, inventaire..."
                            value={reasons[p.id] ?? ""}
                            onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            className="btn-base btn-success !min-h-9 !px-3 !py-1.5 text-xs"
                            disabled={adjustStock.isPending || !drafts[p.id]}
                            onClick={() => apply(p.id, p.stock)}
                          >
                            Appliquer
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {stockAlerts.length > 0 && (
        <>
          <h2 className="mt-10 text-lg">Alertes de réassort</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clients à recontacter par WhatsApp dès que le produit est de nouveau en stock.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {stockAlerts.map((a) => {
              const p = products.find((x) => x.id === a.productId);
              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {p ? `${p.brand} ${p.name}` : "Produit supprimé"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.phone} · {formatDate(a.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${a.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                    >
                      Contacter
                    </a>
                    <button
                      type="button"
                      className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                      onClick={() => deleteStockAlert.mutate(a.id)}
                    >
                      Marquer comme contacté
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Historique des mouvements</h2>
        {movements.length > 0 && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`,
                ["Date", "Produit", "Ancien stock", "Nouveau stock", "Différence", "Raison"],
                movements.map((m) => [
                  formatDate(m.createdAt),
                  m.productName,
                  m.previousStock,
                  m.newStock,
                  m.difference,
                  m.reason,
                ]),
              )
            }
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        )}
      </div>

      {movements.length === 0 ? (
        <p className="mt-3 border border-border p-6 text-sm text-muted-foreground">
          Aucun mouvement pour le moment.
        </p>
      ) : (
        <>
          <div className="mt-3 hidden overflow-x-auto border border-border sm:block">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Date</th>
                  <th className="p-3">Produit</th>
                  <th className="p-3 text-right">Ancien</th>
                  <th className="p-3 text-right">Nouveau</th>
                  <th className="p-3 text-right">Différence</th>
                  <th className="p-3">Raison</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(m.createdAt)}</td>
                    <td className="p-3">{m.productName}</td>
                    <td className="p-3 text-right">{m.previousStock}</td>
                    <td className="p-3 text-right">{m.newStock}</td>
                    <td
                      className={`p-3 text-right font-medium ${m.difference < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {m.difference > 0 ? `+${m.difference}` : m.difference}
                    </td>
                    <td className="p-3 text-muted-foreground">{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:hidden">
            {movements.map((m) => (
              <div key={m.id} className="border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{m.productName}</span>
                  <span
                    className={`font-medium ${m.difference < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {m.difference > 0 ? `+${m.difference}` : m.difference}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDate(m.createdAt)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.previousStock} → {m.newStock}
                </div>
                {m.reason && <div className="mt-1 text-xs text-muted-foreground">{m.reason}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
