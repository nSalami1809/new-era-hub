import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { useProducts, useUpdateProduct } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { discountPercent } from "@/lib/types";

export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
});

function AdminPromotions() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const updateProduct = useUpdateProduct();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  return (
    <div>
      <h1 className="text-2xl">Promotions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {active.length} produit{active.length > 1 ? "s" : ""} actuellement en promotion.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Produit</th>
                <th className="p-3 text-right">Prix normal</th>
                <th className="p-3 text-right">Prix promo actuel</th>
                <th className="p-3 text-right">Réduction</th>
                <th className="p-3 text-right">Nouveau prix promo</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const percent = discountPercent(p);
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
