import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { useProducts } from "@/lib/api/products";
import { useAdjustStock, useStockMovements } from "@/lib/api/stock";
import { stockStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/stocks")({
  component: AdminStocks,
});

function AdminStocks() {
  const { data: products = [], isLoading } = useProducts();
  const { data: movements = [] } = useStockMovements();
  const adjustStock = useAdjustStock();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const outOfStock = products.filter((p) => stockStatus(p) === "out").length;
  const lowStock = products.filter((p) => stockStatus(p) === "low").length;

  function apply(productId: string, currentStock: number) {
    const raw = drafts[productId];
    const newStock = raw === undefined || raw === "" ? currentStock : Math.max(0, Math.round(Number(raw)));
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
      <h1 className="text-2xl">Stocks</h1>

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
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
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
                      <span
                        className={
                          status === "out" ? "text-destructive" : status === "low" ? "text-warning" : "text-success"
                        }
                      >
                        {status === "out" ? "Rupture" : status === "low" ? "Stock faible" : "En stock"}
                      </span>
                    </td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 text-lg">Historique des mouvements</h2>
      <div className="mt-3 overflow-x-auto border border-border">
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
                <td className={`p-3 text-right font-medium ${m.difference < 0 ? "text-destructive" : "text-success"}`}>
                  {m.difference > 0 ? `+${m.difference}` : m.difference}
                </td>
                <td className="p-3 text-muted-foreground">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <p className="p-6 text-sm text-muted-foreground">Aucun mouvement pour le moment.</p>}
      </div>
    </div>
  );
}
