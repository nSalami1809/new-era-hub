import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { effectivePrice } from "@/lib/types";

type SortKey = "recent" | "price-asc" | "price-desc" | "name";

type BoutiqueSearch = {
  q?: string | undefined;
  promo?: boolean | undefined;
  brand?: string | undefined;
  sort?: SortKey | undefined;
  dispo?: boolean | undefined;
};

export const Route = createFileRoute("/boutique")({
  validateSearch: (search: Record<string, unknown>): BoutiqueSearch => ({
    q: typeof search['q'] === "string" && search['q'] ? search['q'] : undefined,
    promo: search['promo'] === true || search['promo'] === "true" ? true : undefined,
    dispo: search['dispo'] === true || search['dispo'] === "true" ? true : undefined,
    brand: typeof search['brand'] === "string" && search['brand'] ? search['brand'] : undefined,
    sort: (["recent", "price-asc", "price-desc", "name"] as const).includes(search['sort'] as SortKey)
      ? (search['sort'] as SortKey)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Boutique — toutes nos casquettes | New Era Hub 241" },
      {
        name: "description",
        content: "Parcourez le catalogue complet : marques, promotions, disponibilité et recherche instantanée.",
      },
      { property: "og:title", content: "Boutique — toutes nos casquettes" },
      { property: "og:description", content: "Catalogue complet de casquettes avec recherche, filtres et tri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Boutique,
});

function Boutique() {
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/boutique" });
  const [term, setTerm] = useState(search.q ?? "");

  useEffect(() => {
    setTerm(search.q ?? "");
  }, [search.q]);

  const brands = useMemo(
    () => Array.from(new Set(products.filter((p) => p.isActive).map((p) => p.brand))).sort(),
    [products],
  );

  const results = useMemo(() => {
    const q = (search.q ?? "").trim().toLowerCase();
    let list = products.filter((p) => p.isActive);
    if (q)
      list = list.filter((p) =>
        [p.name, p.brand, p.sku].some((v) => v.toLowerCase().includes(q)),
      );
    if (search.brand) list = list.filter((p) => p.brand === search.brand);
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

  function update(patch: Partial<BoutiqueSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-2xl sm:text-3xl">Boutique</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {results.length} produit{results.length > 1 ? "s" : ""} disponible{results.length > 1 ? "s" : ""}
        </p>

        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: term.trim() || undefined });
          }}
        >
          <label htmlFor="shop-search" className="sr-only">
            Rechercher une casquette
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="shop-search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Rechercher une casquette, une marque..."
                className="field pl-10"
              />
            </div>
            <button type="submit" className="btn-base btn-dark">
              Rechercher
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
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

          {(search.q || search.brand || search.promo || search.dispo || search.sort) && (
            <button
              type="button"
              className="ml-auto text-sm underline"
              onClick={() => navigate({ search: {} })}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="mt-10 border border-border p-10 text-center">
            <p className="font-semibold">Aucun produit ne correspond à votre recherche.</p>
            <p className="mt-1 text-sm text-muted-foreground">Essayez un autre mot-clé ou retirez les filtres.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} currency={settings?.currency ?? "FCFA"} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
