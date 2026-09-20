import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { formatPrice } from "@/lib/format";
import { cartTotals, removeFromCart, setCartQuantity, useCart } from "@/lib/cart";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { effectivePrice } from "@/lib/types";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Votre panier | New Era Hub 241" },
      { name: "description", content: "Vérifiez vos articles, ajustez les quantités et passez votre commande." },
      { property: "og:title", content: "Votre panier | New Era Hub 241" },
      { property: "og:description", content: "Vérifiez vos articles et passez commande en quelques secondes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const totals = cartTotals(cart, products);

  const lines = cart
    .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
    .filter((l) => l.product);

  if (lines.length === 0) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="text-2xl">Votre panier est vide.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Parcourez le catalogue pour trouver votre casquette.</p>
          <Link to="/boutique" className="btn-base btn-dark mt-6">
            Continuer mes achats
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-2xl sm:text-3xl">Panier</h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="divide-y divide-border border-y border-border">
            {lines.map(({ item, product }) => {
              const p = product!;
              const unit = effectivePrice(p);
              return (
                <div key={p.id} className="flex gap-4 py-4">
                  <Link to="/produit/$id" params={{ id: p.id }} className="h-24 w-24 shrink-0 border border-border bg-white">
                    <img
                      src={p.images[0]}
                      alt={`${p.brand} ${p.name}`}
                      loading="lazy"
                      className="h-full w-full object-contain p-1.5"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{p.brand}</span>
                    <Link to="/produit/$id" params={{ id: p.id }} className="font-semibold hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {formatPrice(unit, currency)} l'unité
                    </span>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="flex items-center border border-border-strong">
                        <button
                          type="button"
                          className="h-10 w-10"
                          aria-label={`Diminuer la quantité de ${p.name}`}
                          onClick={() => setCartQuantity(p.id, item.quantity - 1, p.stock)}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          className="h-10 w-10"
                          aria-label={`Augmenter la quantité de ${p.name}`}
                          onClick={() => setCartQuantity(p.id, item.quantity + 1, p.stock)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn-base btn-danger !min-h-10 !px-3 !py-2 text-sm"
                        onClick={() => removeFromCart(p.id)}
                      >
                        <Trash2 size={16} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="text-right font-semibold">{formatPrice(unit * item.quantity, currency)}</div>
                </div>
              );
            })}
          </div>

          <aside className="h-fit border border-border p-5 lg:sticky lg:top-24">
            <h2 className="text-lg">Résumé</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sous-total</dt>
                <dd>{formatPrice(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Réduction</dt>
                <dd className={totals.discount > 0 ? "text-success" : ""}>
                  {totals.discount > 0 ? `-${formatPrice(totals.discount, currency)}` : formatPrice(0, currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total, currency)}</dd>
              </div>
            </dl>
            <Link to="/commande" className="btn-base btn-success mt-5 w-full">
              Passer la commande
            </Link>
            <Link to="/boutique" className="btn-base btn-outline mt-2 w-full">
              Continuer mes achats
            </Link>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
