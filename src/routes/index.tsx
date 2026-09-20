import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "New Era Hub 241 — Casquettes originales à Dakar" },
      {
        name: "description",
        content:
          "Boutique de casquettes : Nike, New Era, Carhartt, Adidas. Commande en ligne, paiement finalisé sur WhatsApp.",
      },
      { property: "og:title", content: "New Era Hub 241 — Casquettes originales" },
      {
        property: "og:description",
        content: "Sélection de casquettes, prix clairs, commande rapide et paiement sur WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const active = products.filter((p) => p.isActive);
  const featured = active.filter((p) => p.isFeatured).slice(0, 4);
  const promos = active.filter((p) => p.promotionalPrice && p.promotionalPrice < p.price).slice(0, 4);
  const currency = settings?.currency ?? "FCFA";

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-page flex flex-col gap-4 py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Nouvelle sélection disponible
          </p>
          <h1 className="max-w-2xl text-3xl leading-tight sm:text-4xl">
            Des casquettes pensées pour votre style.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Marques reconnues, stock réel, livraison dans votre ville. Vous commandez ici, vous finalisez le paiement
            sur WhatsApp.
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

      <section className="container-page py-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl sm:text-2xl">Sélection du moment</h2>
          <Link to="/boutique" className="text-sm font-medium underline">
            Tout voir
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {(featured.length ? featured : active.slice(0, 4)).map((p) => (
            <ProductCard key={p.id} product={p} currency={currency} />
          ))}
        </div>
      </section>

      {promos.length > 0 && (
        <section className="container-page pb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-xl sm:text-2xl">Promotions en cours</h2>
            <Link to="/boutique" search={{ promo: true }} className="text-sm font-medium underline">
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
