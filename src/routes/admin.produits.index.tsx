import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useProducts, useDeleteProduct, useUpdateProduct } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { stockStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/produits/")({
  component: AdminProducts,
});

function AdminProducts() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = products.filter((p) =>
    [p.name, p.brand, p.sku].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const target = products.find((p) => p.id === toDelete);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Produits</h1>
        <Link to="/admin/produits/nouveau" className="btn-base btn-success">
          Nouveau produit
        </Link>
      </div>

      <label htmlFor="admin-product-search" className="sr-only">
        Rechercher un produit
      </label>
      <input
        id="admin-product-search"
        className="field mt-4 max-w-md"
        placeholder="Rechercher un produit, une marque, une référence..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Image</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Marque</th>
                <th className="p-3 text-right">Prix</th>
                <th className="p-3 text-right">Promo</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = stockStatus(p);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <img src={p.images[0]} alt="" loading="lazy" className="h-12 w-12 border border-border bg-white object-contain p-1" />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku}</div>
                    </td>
                    <td className="p-3">{p.brand}</td>
                    <td className="p-3 text-right">{formatPrice(p.price, currency)}</td>
                    <td className="p-3 text-right">
                      {p.promotionalPrice ? formatPrice(p.promotionalPrice, currency) : "—"}
                    </td>
                    <td className="p-3 text-right">{p.stock}</td>
                    <td className="p-3">
                      <span
                        className={
                          status === "out"
                            ? "text-destructive"
                            : status === "low"
                              ? "text-warning"
                              : p.isActive
                                ? "text-success"
                                : "text-muted-foreground"
                        }
                      >
                        {!p.isActive
                          ? "Masqué"
                          : status === "out"
                            ? "Rupture"
                            : status === "low"
                              ? "Stock faible"
                              : "En stock"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to="/admin/produits/$id"
                          params={{ id: p.id }}
                          className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                        >
                          <Pencil size={14} />
                          Modifier
                        </Link>
                        {p.promotionalPrice ? (
                          <button
                            type="button"
                            className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                            onClick={() => updateProduct.mutate({ id: p.id, patch: { promotionalPrice: null } })}
                          >
                            Retirer la promo
                          </button>
                        ) : (
                          <Link
                            to="/admin/promotions"
                            className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                          >
                            Mettre en promo
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn-base btn-danger !min-h-9 !px-2.5 !py-1.5 text-xs"
                          onClick={() => setToDelete(p.id)}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground">Aucun produit trouvé.</p>}
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm border border-border bg-background p-5">
            <h2 className="text-lg">Supprimer ce produit ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {target.brand} {target.name} — cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-base btn-outline" onClick={() => setToDelete(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-base btn-danger"
                onClick={() => {
                  deleteProduct.mutate(target.id);
                  setToDelete(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
