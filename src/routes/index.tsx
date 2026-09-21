import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { ProductGridSkeleton, Skeleton } from "@/components/Skeleton";
import { productsQueryOptions, useProducts } from "@/lib/api/products";
import { settingsQueryOptions, useSettings } from "@/lib/api/settings";
import type { Product } from "@/lib/types";

function CategoryTile({
  category,
  count,
  cover,
}: {
  category: string;
  count: number;
  cover: Product;
}) {
  return (
    <Link
      to="/boutique"
      search={{ category }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden bg-white">
        <ProductImage
          src={cover.images[0]}
          alt=""
          width={300}
          className="h-full w-full object-contain p-6 transition-transform duration-300 ease-out group-hover:scale-105 sm:p-8"
        />
      </div>
      <div className="p-3 sm:p-4">
        <span className="text-sm font-bold uppercase tracking-wide sm:text-base">{category}</span>
        <span className="block text-xs text-muted-foreground">
          {count} produit{count > 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQueryOptions),
      context.queryClient.ensureQueryData(settingsQueryOptions),
    ]);
  },
  head: () => ({
    meta: [
      { title: "New Era Hub 241 — Casquettes, vêtements, chaussures, accessoires" },
      {
        name: "description",
        content:
          "Boutique en ligne : casquettes, vêtements, chaussures, accessoires. Commande en ligne, paiement finalisé sur WhatsApp.",
      },
      { property: "og:title", content: "New Era Hub 241" },
      {
        property: "og:description",
        content: "Sélection de produits, prix clairs, commande rapide et paiement sur WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const active = products.filter((p) => p.isActive);
  const featured = active.filter((p) => p.isFeatured).slice(0, 4);
  const promos = active
    .filter((p) => p.promotionalPrice && p.promotionalPrice < p.price)
    .slice(0, 4);
  const currency = settings?.currency ?? "FCFA";

  const categories = Array.from(new Set(active.map((p) => p.category)))
    .map((category) => {
      const inCategory = active.filter((p) => p.category === category);
      const cover = inCategory.find((p) => p.isFeatured) ?? inCategory[0];
      return { category, count: inCategory.length, cover };
    })
    .filter((c) => c.count > 0 && c.cover);

  const heroProduct = featured[0] ?? active[0];

  return (
    <SiteLayout>
      <section className="overflow-hidden border-b border-border bg-muted/30">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-2 lg:py-20">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">— Nouvelle sélection disponible</span>
            <h1 className="max-w-xl text-4xl sm:text-5xl">
              Le style qu'il vous faut, livré chez vous.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Découvrez nos produits sélectionnés avec soin, disponibles en stock. Commandez
              facilement et finalisez votre paiement directement sur WhatsApp.
            </p>
            <p className="max-w-xl text-sm font-semibold sm:text-base">
              Livraison à Libreville, Owendo, Akanda et Ntoum.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link to="/boutique" className="btn-base btn-dark">
                Voir la boutique
              </Link>
              <Link to="/boutique" search={{ promo: true }} className="btn-base btn-outline">
                Voir les promotions
              </Link>
            </div>
          </div>

          {heroProduct && (
            <Link
              to="/produit/$id"
              params={{ id: heroProduct.id }}
              className="group relative mx-auto block aspect-square w-full max-w-md overflow-hidden rounded-3xl border border-border bg-white shadow-sm"
              aria-label={`Voir ${heroProduct.brand} ${heroProduct.name}`}
            >
              <ProductImage
                src={heroProduct.images[0]}
                alt={`${heroProduct.brand} ${heroProduct.name}`}
                priority
                width={450}
                className="h-full w-full object-contain p-10 transition-transform duration-300 ease-out group-hover:scale-105 sm:p-14"
              />
            </Link>
          )}
        </div>
      </section>

      {isLoading && (
        <section className="container-page py-10">
          <span className="eyebrow">Catalogue</span>
          <h2 className="mt-1 mb-4 text-2xl sm:text-3xl">Découvrir par catégorie</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
            ))}
          </div>
        </section>
      )}

      {!isLoading && categories.length > 0 && (
        <section className="container-page py-10">
          <span className="eyebrow">Catalogue</span>
          <h2 className="mt-1 mb-4 text-2xl sm:text-3xl">Découvrir par catégorie</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map(({ category, count, cover }) => (
              <CategoryTile key={category} category={category} count={count} cover={cover!} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Notre choix</span>
            <h2 className="mt-1 text-2xl sm:text-3xl">Sélection du moment</h2>
          </div>
          <Link to="/boutique" className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-sm">
            Tout voir
          </Link>
        </div>
        {isLoading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {(featured.length ? featured : active.slice(0, 4)).map((p, i) => (
              <ProductCard key={p.id} product={p} currency={currency} priority={i === 0} />
            ))}
          </div>
        )}
      </section>

      {promos.length > 0 && (
        <section className="container-page pb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">En ce moment</span>
              <h2 className="mt-1 text-2xl sm:text-3xl">Promotions en cours</h2>
            </div>
            <Link
              to="/boutique"
              search={{ promo: true }}
              className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-sm"
            >
              Toutes les promotions
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {promos.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
