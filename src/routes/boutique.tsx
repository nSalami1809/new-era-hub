import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteLayout } from "@/components/site";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeleton";
import {
  publicProductsInfiniteQueryOptions,
  productFilterOptionsQueryOptions,
  usePaginatedPublicProducts,
  useProductFilterOptions,
  type ProductSortKey,
  type PublicProductFilters,
} from "@/lib/api/products";
import { settingsQueryOptions, useSettings } from "@/lib/api/settings";
import { categoriesQueryOptions, useCategories } from "@/lib/api/categories";
import type { ProductCategory } from "@/lib/types";

type BoutiqueSearch = {
  q?: string | undefined;
  promo?: boolean | undefined;
  brand?: string | undefined;
  category?: ProductCategory | undefined;
  size?: string | undefined;
  sort?: ProductSortKey | undefined;
  dispo?: boolean | undefined;
};

// Shared by loaderDeps (SSR prefetch) and the component (client query) so
// both build the exact same filters object — if they didn't match, the
// SSR-prefetched page and the client's query key would diverge and the
// prefetch would be wasted (a silent re-fetch after hydration).
function toProductFilters(search: BoutiqueSearch): PublicProductFilters {
  return {
    q: search.q,
    category: search.category,
    brand: search.brand,
    size: search.size,
    promo: search.promo,
    dispo: search.dispo,
    sort: search.sort,
  };
}

export const Route = createFileRoute("/boutique")({
  validateSearch: (search: Record<string, unknown>): BoutiqueSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    promo: search["promo"] === true || search["promo"] === "true" ? true : undefined,
    dispo: search["dispo"] === true || search["dispo"] === "true" ? true : undefined,
    brand: typeof search["brand"] === "string" && search["brand"] ? search["brand"] : undefined,
    size: typeof search["size"] === "string" && search["size"] ? search["size"] : undefined,
    category:
      typeof search["category"] === "string" && search["category"]
        ? (search["category"] as ProductCategory)
        : undefined,
    sort: (["recent", "price-asc", "price-desc", "name"] as const).includes(
      search["sort"] as ProductSortKey,
    )
      ? (search["sort"] as ProductSortKey)
      : undefined,
  }),
  loaderDeps: ({ search }) => toProductFilters(search),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(publicProductsInfiniteQueryOptions(deps)),
      context.queryClient.ensureQueryData(productFilterOptionsQueryOptions),
      context.queryClient.ensureQueryData(settingsQueryOptions),
      context.queryClient.ensureQueryData(categoriesQueryOptions),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Boutique — tous nos produits | New Era Hub 241" },
      {
        name: "description",
        content:
          "Parcourez le catalogue complet : catégories, marques, promotions, disponibilité et recherche instantanée.",
      },
      { property: "og:title", content: "Boutique — tous nos produits" },
      { property: "og:description", content: "Catalogue complet avec recherche, filtres et tri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Boutique,
});

function Boutique() {
  const { data: settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: filterOptions } = useProductFilterOptions();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/boutique" });

  const filters = useMemo(() => toProductFilters(search), [search]);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    usePaginatedPublicProducts(filters);

  const products = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const total = data?.pages.at(-1)?.total ?? 0;
  const brands = filterOptions?.brands ?? [];
  const sizes = filterOptions?.sizes ?? [];

  function update(patch: Partial<BoutiqueSearch>) {
    navigate({ search: (prev: BoutiqueSearch) => ({ ...prev, ...patch }) });
  }

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <Breadcrumb items={[{ label: "Accueil", to: "/" }, { label: "Boutique" }]} />
        <h1 className="text-2xl sm:text-3xl">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {search.q ? (
            <>
              {total} résultat{total > 1 ? "s" : ""} pour « {search.q} »
            </>
          ) : (
            <>
              {total} produit{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <label htmlFor="category" className="text-sm text-muted-foreground">
              Catégorie
            </label>
            <select
              id="category"
              className="field !min-h-[38px] w-auto"
              value={search.category ?? ""}
              onChange={(e) =>
                update({ category: (e.target.value as ProductCategory) || undefined })
              }
            >
              <option value="">Toutes</option>
              {categories
                .filter((c) => c.isVisible)
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="brand" className="text-sm text-muted-foreground">
              Marque
            </label>
            <select
              id="brand"
              className="field !min-h-[38px] w-auto"
              value={search.brand ?? ""}
              onChange={(e) => update({ brand: e.target.value || undefined })}
            >
              <option value="">Toutes</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {sizes.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="size" className="text-sm text-muted-foreground">
                Taille
              </label>
              <select
                id="size"
                className="field !min-h-[38px] w-auto"
                value={search.size ?? ""}
                onChange={(e) => update({ size: e.target.value || undefined })}
              >
                <option value="">Toutes</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-muted-foreground">
              Trier par
            </label>
            <select
              id="sort"
              className="field !min-h-[38px] w-auto"
              value={search.sort ?? "recent"}
              onChange={(e) => update({ sort: e.target.value as ProductSortKey })}
            >
              <option value="recent">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom A-Z</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!search.promo}
              onChange={(e) => update({ promo: e.target.checked || undefined })}
            />
            Promotions
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!search.dispo}
              onChange={(e) => update({ dispo: e.target.checked || undefined })}
            />
            En stock uniquement
          </label>

          {(search.q ||
            search.brand ||
            search.category ||
            search.size ||
            search.promo ||
            search.dispo ||
            search.sort) && (
            <button
              type="button"
              className="ml-auto text-sm text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => navigate({ search: {} })}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-6">
            <ProductGridSkeleton count={8} />
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <p className="font-semibold">Erreur de chargement.</p>
            <button
              type="button"
              className="btn-base btn-outline mt-3"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <p className="font-semibold">Aucun produit ne correspond à votre recherche.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez un autre mot-clé ou retirez les filtres.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={settings?.currency ?? "FCFA"}
                  priority={i === 0}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {products.length} sur {total} produits
                </p>
                <button
                  type="button"
                  className="btn-base btn-outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? "Chargement..." : "Charger plus de produits"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
