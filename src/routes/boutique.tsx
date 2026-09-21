import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { useCategories } from "@/lib/api/categories";
import { effectivePrice, type ProductCategory } from "@/lib/types";

type SortKey = "recent" | "price-asc" | "price-desc" | "name";

const PAGE_SIZE = 24;

type BoutiqueSearch = {
  q?: string | undefined;
  promo?: boolean | undefined;
  brand?: string | undefined;
  category?: ProductCategory | undefined;
  size?: string | undefined;
  sort?: SortKey | undefined;
  dispo?: boolean | undefined;
};

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
      search["sort"] as SortKey,
    )
      ? (search["sort"] as SortKey)
      : undefined,
  }),
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
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/boutique" });

  const brands = useMemo(
    () => Array.from(new Set(products.filter((p) => p.isActive).map((p) => p.brand))).sort(),
    [products],
  );

  const sizes = useMemo(
    () =>
      Array.from(
        new Set(products.filter((p) => p.isActive).flatMap((p) => p.variants.map((v) => v.size))),
      ).sort(),
    [products],
  );

  const results = useMemo(() => {
    const q = (search.q ?? "").trim().toLowerCase();
    let list = products.filter((p) => p.isActive);
    if (q)
      list = list.filter((p) => [p.name, p.brand, p.sku].some((v) => v.toLowerCase().includes(q)));
    if (search.category) list = list.filter((p) => p.category === search.category);
    if (search.brand) list = list.filter((p) => p.brand === search.brand);
    if (search.size) list = list.filter((p) => p.variants.some((v) => v.size === search.size));
    if (search.promo) list = list.filter((p) => p.promotionalPrice && p.promotionalPrice < p.price);
    if (search.dispo) list = list.filter((p) => p.stock > 0);

    const sorted = [...list];
    switch (search.sort) {
      case "price-asc":
        sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [products, search]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);
  const visible = results.slice(0, visibleCount);

  function update(patch: Partial<BoutiqueSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Accueil
          </Link>{" "}
          / <span className="text-foreground">Boutique</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {search.q ? (
            <>
              {results.length} résultat{results.length > 1 ? "s" : ""} pour « {search.q} »
            </>
          ) : (
            <>
              {results.length} produit{results.length > 1 ? "s" : ""} disponible
              {results.length > 1 ? "s" : ""}
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-border py-3">
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
              {categories.map((c) => (
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
              onChange={(e) => update({ sort: e.target.value as SortKey })}
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
        ) : results.length === 0 ? (
          <div className="mt-10 border border-border p-10 text-center">
            <p className="font-semibold">Aucun produit ne correspond à votre recherche.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Essayez un autre mot-clé ou retirez les filtres.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={settings?.currency ?? "FCFA"}
                  priority={i === 0}
                />
              ))}
            </div>
            {visibleCount < results.length && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {visible.length} sur {results.length} produits
                </p>
                <button
                  type="button"
                  className="btn-base btn-outline"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Charger plus de produits
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
  );
}
