import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ViewToggle } from "@/components/ViewToggle";
import { AdminCardGridSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { formatPrice } from "@/lib/format";
import { useProducts, useUpdateProduct } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { useViewMode } from "@/lib/use-view-mode";
import { discountPercent, type Product } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/promotions")({
  component: AdminPromotions,
});

function AdminPromotions() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const updateProduct = useUpdateProduct();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [bundleQtyDrafts, setBundleQtyDrafts] = useState<Record<string, string>>({});
  const [bundlePriceDrafts, setBundlePriceDrafts] = useState<Record<string, string>>({});
  const [view, setView] = useViewMode("admin-promotions-view");

  const active = products.filter((p) => p.promotionalPrice && p.promotionalPrice < p.price);

  function applyPromo(productId: string, price: number) {
    const raw = drafts[productId];
    const promo = Number(raw);
    if (!raw || !Number.isFinite(promo) || promo <= 0 || promo >= price) return;
    updateProduct.mutate(
      { id: productId, patch: { promotionalPrice: promo } },
      { onSuccess: () => setDrafts((d) => ({ ...d, [productId]: "" })) },
    );
  }

  function removePromo(productId: string) {
    updateProduct.mutate({ id: productId, patch: { promotionalPrice: null } });
  }

  function bundleDraftFor(p: Product) {
    return {
      qty: bundleQtyDrafts[p.id] ?? (p.bundleQuantity ? String(p.bundleQuantity) : ""),
      price: bundlePriceDrafts[p.id] ?? (p.bundlePrice ? String(p.bundlePrice) : ""),
    };
  }

  function applyBundle(p: Product) {
    const { qty, price } = bundleDraftFor(p);
    const quantity = Math.round(Number(qty));
    const bundlePrice = Number(price);
    if (!Number.isFinite(quantity) || quantity < 2) return;
    if (!Number.isFinite(bundlePrice) || bundlePrice <= 0 || bundlePrice >= quantity * p.price)
      return;
    updateProduct.mutate(
      { id: p.id, patch: { bundleQuantity: quantity, bundlePrice, bundleActive: true } },
      {
        onSuccess: () => {
          setBundleQtyDrafts((d) => ({ ...d, [p.id]: "" }));
          setBundlePriceDrafts((d) => ({ ...d, [p.id]: "" }));
        },
      },
    );
  }

  function setBundleActive(p: Product, bundleActive: boolean) {
    updateProduct.mutate({ id: p.id, patch: { bundleActive } });
  }

  function clearBundle(p: Product) {
    updateProduct.mutate({
      id: p.id,
      patch: { bundleQuantity: null, bundlePrice: null, bundleActive: false },
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Promotions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} produit{active.length > 1 ? "s" : ""} actuellement en promotion.
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {isLoading ? (
        <div className="mt-6">
          {view === "grid" ? (
            <AdminCardGridSkeleton count={3} />
          ) : (
            <div className="overflow-x-auto border border-border">
              <AdminTableSkeleton cols={8} />
            </div>
          )}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 border border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun produit pour le moment. Ajoutez un produit pour pouvoir le mettre en promotion.
          </p>
          <Link to="/nehub-53ff1f11/produits/nouveau" className="btn-base btn-success mt-4">
            Nouveau produit
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const percent = discountPercent(p);
            const bundleDraft = bundleDraftFor(p);
            const bundleConfigured = p.bundleQuantity !== null && p.bundlePrice !== null;
            return (
              <div key={p.id} className="border border-border p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.brand} · {p.sku}
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Prix promotionnel
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>Prix normal : {formatPrice(p.price, currency)}</span>
                    {percent !== null && <span className="text-success">-{percent}%</span>}
                  </div>
                  {p.promotionalPrice && (
                    <div className="mt-1 text-sm">
                      Promo actuel : {formatPrice(p.promotionalPrice, currency)}
                    </div>
                  )}
                  <label className="mt-3 block text-xs text-muted-foreground">
                    Nouveau prix promo
                    <input
                      type="number"
                      min={0}
                      max={p.price - 1}
                      className="field !min-h-9 mt-1 w-full text-right"
                      placeholder="Prix promo"
                      value={drafts[p.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn-base btn-success !min-h-9 flex-1 !px-3 !py-1.5 text-xs"
                      disabled={updateProduct.isPending || !drafts[p.id]}
                      onClick={() => applyPromo(p.id, p.price)}
                    >
                      Appliquer
                    </button>
                    {p.promotionalPrice && (
                      <button
                        type="button"
                        className="btn-base btn-outline !min-h-9 flex-1 !px-3 !py-1.5 text-xs"
                        onClick={() => removePromo(p.id)}
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Promotion par quantité
                  </div>
                  {bundleConfigured && (
                    <div
                      className={`mt-2 text-sm ${p.bundleActive ? "text-success" : "text-muted-foreground"}`}
                    >
                      {p.bundleQuantity} pour {formatPrice(p.bundlePrice ?? 0, currency)}
                      {p.bundleActive ? " (active)" : " (inactive)"}
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">
                      Qté min
                      <input
                        type="number"
                        min={2}
                        className="field !min-h-9 mt-1 w-full text-right"
                        placeholder="2"
                        value={bundleDraft.qty}
                        onChange={(e) =>
                          setBundleQtyDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                        }
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Prix du lot
                      <input
                        type="number"
                        min={0}
                        className="field !min-h-9 mt-1 w-full text-right"
                        placeholder="Prix total"
                        value={bundleDraft.price}
                        onChange={(e) =>
                          setBundlePriceDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-base btn-success !min-h-9 flex-1 !px-3 !py-1.5 text-xs"
                      disabled={updateProduct.isPending || !bundleDraft.qty || !bundleDraft.price}
                      onClick={() => applyBundle(p)}
                    >
                      {bundleConfigured ? "Mettre à jour" : "Appliquer"}
                    </button>
                    {bundleConfigured && (
                      <button
                        type="button"
                        className="btn-base btn-outline !min-h-9 flex-1 !px-3 !py-1.5 text-xs"
                        onClick={() => setBundleActive(p, !p.bundleActive)}
                      >
                        {p.bundleActive ? "Désactiver" : "Réactiver"}
                      </button>
                    )}
                    {bundleConfigured && (
                      <button
                        type="button"
                        className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                        onClick={() => clearBundle(p)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Produit</th>
                <th className="p-3 text-right">Prix normal</th>
                <th className="p-3 text-right">Prix promo actuel</th>
                <th className="p-3 text-right">Réduction</th>
                <th className="p-3 text-right">Nouveau prix promo</th>
                <th className="p-3 text-right">Action</th>
                <th className="p-3">Promotion par quantité</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const percent = discountPercent(p);
                const bundleDraft = bundleDraftFor(p);
                const bundleConfigured = p.bundleQuantity !== null && p.bundlePrice !== null;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.brand} · {p.sku}
                      </div>
                    </td>
                    <td className="p-3 text-right">{formatPrice(p.price, currency)}</td>
                    <td className="p-3 text-right">
                      {p.promotionalPrice ? formatPrice(p.promotionalPrice, currency) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {percent !== null ? <span className="text-success">-{percent}%</span> : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={p.price - 1}
                        className="field !min-h-9 w-28 text-right"
                        placeholder="Prix promo"
                        value={drafts[p.id] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-base btn-success !min-h-9 !px-3 !py-1.5 text-xs"
                          disabled={updateProduct.isPending || !drafts[p.id]}
                          onClick={() => applyPromo(p.id, p.price)}
                        >
                          Appliquer
                        </button>
                        {p.promotionalPrice && (
                          <button
                            type="button"
                            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                            onClick={() => removePromo(p.id)}
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={2}
                          className="field !min-h-9 w-16 text-right"
                          placeholder="Qté"
                          value={bundleDraft.qty}
                          onChange={(e) =>
                            setBundleQtyDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">pour</span>
                        <input
                          type="number"
                          min={0}
                          className="field !min-h-9 w-28 text-right"
                          placeholder="Prix du lot"
                          value={bundleDraft.price}
                          onChange={(e) =>
                            setBundlePriceDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                          }
                        />
                      </div>
                      {bundleConfigured && (
                        <div
                          className={`mt-1 text-xs ${p.bundleActive ? "text-success" : "text-muted-foreground"}`}
                        >
                          Actuel : {p.bundleQuantity} pour{" "}
                          {formatPrice(p.bundlePrice ?? 0, currency)}
                          {p.bundleActive ? " (active)" : " (inactive)"}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn-base btn-success !min-h-9 !px-3 !py-1.5 text-xs"
                          disabled={
                            updateProduct.isPending || !bundleDraft.qty || !bundleDraft.price
                          }
                          onClick={() => applyBundle(p)}
                        >
                          {bundleConfigured ? "MAJ" : "Appliquer"}
                        </button>
                        {bundleConfigured && (
                          <button
                            type="button"
                            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                            onClick={() => setBundleActive(p, !p.bundleActive)}
                          >
                            {p.bundleActive ? "Désactiver" : "Réactiver"}
                          </button>
                        )}
                        {bundleConfigured && (
                          <button
                            type="button"
                            className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                            onClick={() => clearBundle(p)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
