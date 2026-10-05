import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { ViewToggle } from "@/components/ViewToggle";
import { Pager } from "@/components/Pager";
import { AdminCardGridSkeleton, AdminTableSkeleton } from "@/components/Skeleton";
import { formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  fetchAllMatchingAdminProducts,
  usePaginatedAdminProducts,
  useDeleteProduct,
  useUpdateProduct,
  type AdminProductFilters,
} from "@/lib/api/products";
import { useCategories } from "@/lib/api/categories";
import { useSettings } from "@/lib/api/settings";
import { useViewMode } from "@/lib/use-view-mode";
import { usePersistedState } from "@/lib/use-persisted-state";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { stockStatus, unitProfit, profitMargin, type Product } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/produits/")({
  component: AdminProducts,
});

function statusMeta(p: Product, status: "in" | "low" | "out") {
  const className =
    status === "out"
      ? "text-destructive"
      : status === "low"
        ? "text-warning"
        : p.isActive
          ? "text-success"
          : "text-muted-foreground";
  const label = !p.isActive
    ? "Masqué"
    : status === "out"
      ? "Rupture"
      : status === "low"
        ? "Stock faible"
        : "En stock";
  return { className, label };
}

function AdminProducts() {
  const { data: categories = [] } = useCategories();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [categoryFilter, setCategoryFilter] = usePersistedState("admin-products-category-filter");
  const [view, setView] = useViewMode("admin-products-view");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const filters: AdminProductFilters = {
    q: debouncedQuery || undefined,
    category: categoryFilter || undefined,
  };

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, categoryFilter]);

  const { data, isLoading, isFetching } = usePaginatedAdminProducts(filters, page);
  const products = data?.rows ?? [];
  const total = data?.total ?? 0;
  const target = products.find((p) => p.id === toDelete);

  useEffect(() => {
    setSelected(new Set());
  }, [debouncedQuery, categoryFilter]);

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
      products.every((p) => s.has(p.id)) ? new Set() : new Set(products.map((p) => p.id)),
    );
  }

  async function selectAllFiltered() {
    setSelectingAll(true);
    try {
      const all = await fetchAllMatchingAdminProducts(filters);
      setSelected(new Set(all.map((p) => p.id)));
    } finally {
      setSelectingAll(false);
    }
  }

  async function bulkSetActive(isActive: boolean) {
    setBulkPending(true);
    await Promise.all(
      Array.from(selected).map((id) => updateProduct.mutateAsync({ id, patch: { isActive } })),
    );
    setBulkPending(false);
    setSelected(new Set());
  }

  async function bulkDelete() {
    setBulkPending(true);
    await Promise.all(Array.from(selected).map((id) => deleteProduct.mutateAsync(id)));
    setBulkPending(false);
    setSelected(new Set());
    setBulkDeleteConfirm(false);
  }

  async function exportCsv() {
    setExportingCsv(true);
    try {
      const all = await fetchAllMatchingAdminProducts(filters);
      downloadCsv(
        `produits-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Nom",
          "Marque",
          "Catégorie",
          "Référence",
          "Prix",
          "Prix promo",
          "Prix d'achat",
          "Stock",
          "Statut",
        ],
        all.map((p) => {
          const status = stockStatus(p);
          return [
            p.name,
            p.brand,
            p.category,
            p.sku,
            p.price,
            p.promotionalPrice ?? "",
            p.costPrice,
            p.stock,
            !p.isActive
              ? "Masqué"
              : status === "out"
                ? "Rupture"
                : status === "low"
                  ? "Stock faible"
                  : "En stock",
          ];
        }),
      );
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Produits</h1>
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
          <Link to="/nehub-53ff1f11/produits/nouveau" className="btn-base btn-success">
            Nouveau produit
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="admin-product-search" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="admin-product-search"
          className="field w-full sm:max-w-md"
          placeholder="Rechercher un produit, une marque, une référence..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label htmlFor="admin-product-category" className="sr-only">
          Filtrer par catégorie
        </label>
        <select
          id="admin-product-category"
          className="field !min-h-[42px] w-full sm:w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {(selected.size > 0 || total > products.length) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-border bg-muted p-3">
          <span className="text-sm font-medium">
            {selected.size > 0
              ? `${selected.size} produit${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""}`
              : null}
          </span>
          {total > products.length && (
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
                disabled={bulkPending}
                className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                onClick={() => void bulkSetActive(true)}
              >
                Activer
              </button>
              <button
                type="button"
                disabled={bulkPending}
                className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                onClick={() => void bulkSetActive(false)}
              >
                Désactiver
              </button>
              <button
                type="button"
                disabled={bulkPending}
                className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                onClick={() => setBulkDeleteConfirm(true)}
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
              <AdminTableSkeleton cols={9} />
            </div>
          )}
        </div>
      ) : products.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucun produit trouvé.
        </p>
      ) : view === "grid" ? (
        <div
          className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? "opacity-60" : ""}`}
        >
          {products.map((p) => {
            const status = stockStatus(p);
            const { className: statusClassName, label: statusLabel } = statusMeta(p, status);
            return (
              <div
                key={p.id}
                className={`flex flex-col border bg-background ${selected.has(p.id) ? "border-foreground" : "border-border"}`}
              >
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    aria-label={`Sélectionner ${p.name}`}
                  />
                  <ProductImage
                    src={p.images[0]}
                    alt=""
                    width={64}
                    className="h-16 w-16 shrink-0 border border-border bg-white object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.sku}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.brand} · {p.category}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-semibold">{formatPrice(p.price, currency)}</div>
                    {p.promotionalPrice && (
                      <div className="text-xs text-success">
                        Promo : {formatPrice(p.promotionalPrice, currency)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Marge : {formatPrice(unitProfit(p), currency)}
                      {profitMargin(p) !== null ? ` (${profitMargin(p)}%)` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${statusClassName}`}>{statusLabel}</div>
                    <div className="text-xs text-muted-foreground">Stock : {p.stock}</div>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-border p-3">
                  <Link
                    to="/nehub-53ff1f11/produits/$id"
                    params={{ id: p.id }}
                    className="btn-base btn-outline !min-h-9 flex-1 !px-2.5 !py-1.5 text-xs"
                  >
                    <Pencil size={14} />
                    Modifier
                  </Link>
                  {p.promotionalPrice ? (
                    <button
                      type="button"
                      className="btn-base btn-outline !min-h-9 flex-1 !px-2.5 !py-1.5 text-xs"
                      onClick={() =>
                        updateProduct.mutate({ id: p.id, patch: { promotionalPrice: null } })
                      }
                    >
                      Retirer la promo
                    </button>
                  ) : (
                    <Link
                      to="/nehub-53ff1f11/promotions"
                      className="btn-base btn-outline !min-h-9 flex-1 !px-2.5 !py-1.5 text-xs"
                    >
                      Mettre en promo
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn-base btn-danger !min-h-9 flex-1 !px-2.5 !py-1.5 text-xs"
                    onClick={() => setToDelete(p.id)}
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={`mt-4 overflow-x-auto border border-border ${isFetching ? "opacity-60" : ""}`}
        >
          <table className="w-full min-w-[1050px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && products.every((p) => selected.has(p.id))}
                    onChange={toggleSelectPage}
                    aria-label="Tout sélectionner (page affichée)"
                  />
                </th>
                <th className="p-3">Image</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Marque</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Prix</th>
                <th className="p-3 text-right">Promo</th>
                <th className="p-3 text-right">Marge</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const status = stockStatus(p);
                const { className: statusClassName, label: statusLabel } = statusMeta(p, status);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${selected.has(p.id) ? "bg-muted" : ""}`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        aria-label={`Sélectionner ${p.name}`}
                      />
                    </td>
                    <td className="p-3">
                      <ProductImage
                        src={p.images[0]}
                        alt=""
                        width={48}
                        className="h-12 w-12 border border-border bg-white object-contain p-1"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku}</div>
                    </td>
                    <td className="p-3">{p.brand}</td>
                    <td className="p-3 text-muted-foreground">{p.category}</td>
                    <td className="p-3 text-right">{formatPrice(p.price, currency)}</td>
                    <td className="p-3 text-right">
                      {p.promotionalPrice ? formatPrice(p.promotionalPrice, currency) : "—"}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {formatPrice(unitProfit(p), currency)}
                      {profitMargin(p) !== null ? ` (${profitMargin(p)}%)` : ""}
                    </td>
                    <td className="p-3 text-right">{p.stock}</td>
                    <td className="p-3">
                      <span className={statusClassName}>{statusLabel}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to="/nehub-53ff1f11/produits/$id"
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
                            onClick={() =>
                              updateProduct.mutate({ id: p.id, patch: { promotionalPrice: null } })
                            }
                          >
                            Retirer la promo
                          </button>
                        ) : (
                          <Link
                            to="/nehub-53ff1f11/promotions"
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
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <Pager
          page={page}
          pageSize={ADMIN_PRODUCTS_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      {target && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-background p-5">
            <h2 className="text-lg">Supprimer ce produit ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {target.brand} {target.name} — cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={() => setToDelete(null)}
              >
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

      {bulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-background p-5">
            <h2 className="text-lg">
              Supprimer {selected.size} produit{selected.size > 1 ? "s" : ""} ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Cette action est irréversible.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={bulkPending}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-base btn-danger"
                onClick={() => void bulkDelete()}
                disabled={bulkPending}
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
