import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { ProductGridSkeleton, Skeleton } from "@/components/Skeleton";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/")({
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

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-page flex flex-col gap-4 py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Nouvelle sélection disponible
          </p>
          <h1 className="max-w-2xl text-3xl leading-tight sm:text-4xl">
            Des produits pensés pour votre style.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Marques reconnues, stock réel, livraison dans votre ville. Vous commandez ici, vous
            finalisez le paiement sur WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/boutique" className="btn-base btn-dark">
              Voir la boutique
            </Link>
            <Link to="/boutique" search={{ promo: true }} className="btn-base btn-outline">
              Voir les promotions
            </Link>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="container-page py-10">
          <h2 className="mb-4 text-xl sm:text-2xl">Découvrir par catégorie</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </section>
      )}

      {!isLoading && categories.length > 0 && (
        <section className="container-page py-10">
          <h2 className="mb-4 text-xl sm:text-2xl">Découvrir par catégorie</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map(({ category, count, cover }) => (
              <Link
                key={category}
                to="/boutique"
                search={{ category }}
                className="group flex flex-col border border-border bg-card transition-colors hover:border-border-strong"
              >
                <div className="aspect-square overflow-hidden bg-white">
                  <ProductImage
                    src={cover!.images[0]}
                    alt=""
                    className="h-full w-full object-contain p-6 transition-transform duration-200 group-hover:scale-105 sm:p-8"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <span className="text-sm font-bold uppercase tracking-wide sm:text-base">
                    {category}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {count} produit{count > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl sm:text-2xl">Sélection du moment</h2>
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
            <h2 className="text-xl sm:text-2xl">Promotions en cours</h2>
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
