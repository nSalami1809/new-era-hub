import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site";
import { PriceTag, StockBadge } from "@/components/ProductCard";
import { addToCart } from "@/lib/cart";
import { useProduct } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/produit/$id")({
  head: () => ({
    meta: [
      { title: "Fiche produit | New Era Hub 241" },
      { name: "description", content: "Détail du produit : prix, disponibilité, description et ajout au panier." },
      { property: "og:title", content: "Fiche produit | New Era Hub 241" },
      { property: "og:description", content: "Détail du produit : prix, disponibilité et description." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useProduct(id);
  const { data: settings } = useSettings();
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center text-sm text-muted-foreground">Chargement...</div>
      </SiteLayout>
    );
  }

  if (!product || !product.isActive) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="text-2xl">Ce produit n'est plus disponible.</h1>
          <Link to="/boutique" className="btn-base btn-dark mt-6">
            Retour à la boutique
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const out = product.stock <= 0;
  const max = Math.max(1, product.stock);

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <nav className="mb-5 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Accueil
          </Link>{" "}
          /{" "}
          <Link to="/boutique" className="hover:underline">
            Boutique
          </Link>{" "}
          / <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden border border-border bg-white">
              <img
                src={product.images[imageIndex] ?? product.images[0]}
                alt={`${product.brand} ${product.name}`}
                width={816}
                height={816}
                className="h-full w-full object-contain p-8"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    aria-label={`Voir l'image ${i + 1}`}
                    className={`h-20 w-20 overflow-hidden border bg-white ${
                      i === imageIndex ? "border-foreground" : "border-border"
                    }`}
                  >
                    <img src={img} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl">{product.name}</h1>
            <div className="mt-4">
              <PriceTag product={product} currency={settings?.currency ?? "FCFA"} size="lg" />
            </div>
            <div className="mt-2">
              <StockBadge product={product} />
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-y-2 border-y border-border py-4 text-sm">
              <dt className="text-muted-foreground">Référence</dt>
              <dd className="font-medium">{product.sku}</dd>
              <dt className="text-muted-foreground">Stock disponible</dt>
              <dd className="font-medium">{product.stock}</dd>
              <dt className="text-muted-foreground">Marque</dt>
              <dd className="font-medium">{product.brand}</dd>
            </dl>

            {out ? (
              <div className="mt-6">
                <p className="mb-3 font-semibold text-destructive">Rupture de stock</p>
                <button type="button" disabled className="btn-base btn-success w-full sm:w-auto">
                  Ajouter au panier
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-border-strong">
                  <button
                    type="button"
                    className="h-11 w-11 text-lg"
                    aria-label="Diminuer la quantité"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-semibold" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="h-11 w-11 text-lg"
                    aria-label="Augmenter la quantité"
                    onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-base btn-success flex-1 sm:flex-none sm:px-8"
                  onClick={() => addToCart(product.id, quantity, product.stock)}
                >
                  Ajouter au panier
                </button>
                <Link to="/panier" className="btn-base btn-outline">
                  Voir le panier
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
