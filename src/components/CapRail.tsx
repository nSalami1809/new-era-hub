import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PriceTag, StockBadge, isNewProduct } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Stamp } from "@/components/Stamp";
import { addToCart, cartQuantity, setCartQuantity, useCart } from "@/lib/cart";
import { discountPercent, type Product } from "@/lib/types";

// Légers angles de repos fixes (pas aléatoires) pour un rendu stable entre le
// rendu serveur et l'hydratation, et identique à chaque chargement de page.
const REST_ANGLES = [-7, 5, -4, 8, -6, 4, -8, 6, -5, 7];

/** Casquettes "suspendues" sur une tringle — cliquer (ou survoler au clavier/focus)
 * en redresse une au premier plan, les autres restent inclinées et s'estompent
 * légèrement. Transitions CSS pures, pas de simulation physique. */
export function CapRail({ items, currency }: { items: Product[]; currency: string }) {
  useCart(); // se réabonne pour re-rendre quand le panier change (ajout, +/-)
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const active = items.find((p) => p.id === activeId) ?? items[0] ?? null;

  if (items.length === 0 || !active) return null;

  const out = active.stock <= 0;
  const hasVariants = active.variants.length > 0;
  const qty = cartQuantity(active.id, null);
  const percent = discountPercent(active);
  const isNew = !out && percent === null && isNewProduct(active);

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="relative flex min-w-max items-end gap-6 px-4 pt-10 sm:gap-10 sm:px-8">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-6 h-1.5 rounded-full bg-foreground shadow-sm"
          />
          {items.map((product, i) => {
            const isActive = active.id === product.id;
            const angle = REST_ANGLES[i % REST_ANGLES.length];
            return (
              <button
                key={product.id}
                type="button"
                aria-pressed={isActive}
                aria-label={`${product.brand} ${product.name}`}
                onClick={() => setActiveId(product.id)}
                onFocus={() => setActiveId(product.id)}
                className="group relative w-24 shrink-0 cursor-pointer outline-none sm:w-28"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 h-6 w-[3px] -translate-x-1/2 rounded-full bg-foreground/70"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-foreground"
                />
                <div
                  className="relative mt-6 aspect-[3/4] overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-transform duration-300 ease-out will-change-transform group-focus-visible:ring-2 group-focus-visible:ring-ring"
                  style={{
                    transform: isActive
                      ? "rotate(0deg) scale(1.14) translateY(-6px)"
                      : `rotate(${angle}deg) scale(1)`,
                    zIndex: isActive ? 20 : 10,
                    boxShadow: isActive
                      ? "0 16px 24px -12px color-mix(in oklab, var(--color-foreground) 35%, transparent)"
                      : undefined,
                  }}
                >
                  <div
                    className="h-full w-full transition-opacity duration-300"
                    style={{ opacity: isActive ? 1 : 0.45 }}
                  >
                    <ProductImage
                      src={product.images[0]}
                      alt=""
                      width={160}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          {out ? (
            <Stamp tone="danger">Rupture</Stamp>
          ) : percent !== null ? (
            <Stamp tone="danger">-{percent}%</Stamp>
          ) : isNew ? (
            <Stamp tone="accent">Nouveau</Stamp>
          ) : null}
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {active.brand}
          </p>
          <p className="max-w-sm text-xl font-bold text-balance">{active.name}</p>
          <PriceTag product={active} currency={currency} size="lg" />
          <StockBadge product={active} />
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          {hasVariants ? (
            <Link
              to="/produit/$id"
              params={{ id: active.id }}
              className="btn-base btn-dark w-full sm:w-auto"
            >
              {out ? "Indisponible" : "Choisir une option"}
            </Link>
          ) : qty > 0 ? (
            <div className="btn-base btn-success w-full !justify-between !px-0 sm:w-44">
              <button
                type="button"
                aria-label={`Diminuer la quantité de ${active.name}`}
                className="flex h-full items-center justify-center px-4"
                onClick={() => setCartQuantity(active.id, null, qty - 1, active.stock)}
              >
                −
              </button>
              <span aria-live="polite" className="text-base font-semibold">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Augmenter la quantité de ${active.name}`}
                disabled={qty >= active.stock}
                className="flex h-full items-center justify-center px-4 disabled:opacity-50"
                onClick={() => setCartQuantity(active.id, null, qty + 1, active.stock)}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={out}
              onClick={() => addToCart(active.id, null, 1, active.stock)}
              className="btn-base btn-success w-full sm:w-auto"
            >
              {out ? "Indisponible" : "Ajouter au panier"}
            </button>
          )}
          <Link
            to="/produit/$id"
            params={{ id: active.id }}
            className="btn-base btn-outline w-full sm:w-auto"
          >
            Voir le produit
          </Link>
        </div>
      </div>
    </div>
  );
}
