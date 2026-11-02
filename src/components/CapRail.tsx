import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PriceTag, StockBadge, isNewProduct } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Stamp } from "@/components/Stamp";
import { discountPercent, type Product } from "@/lib/types";

// Légers angles de repos fixes (pas aléatoires) pour un rendu stable entre le
// rendu serveur et l'hydratation, et identique à chaque chargement de page.
const REST_ANGLES = [-7, 5, -4, 8, -6, 4, -8, 6, -5, 7];

/** Casquettes "suspendues" sur une tringle — survoler (ou donner le focus au
 * clavier) en redresse une au premier plan pour un aperçu ; cliquer ouvre sa
 * fiche produit complète (photo, variantes, ajout au panier). Transitions CSS
 * pures, pas de simulation physique. */
export function CapRail({ items, currency }: { items: Product[]; currency: string }) {
  const [hoverId, setHoverId] = useState<string | null>(items[0]?.id ?? null);
  const active = items.find((p) => p.id === hoverId) ?? items[0] ?? null;

  if (items.length === 0 || !active) return null;

  const out = active.stock <= 0;
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
              <Link
                key={product.id}
                to="/produit/$id"
                params={{ id: product.id }}
                aria-label={`Voir ${product.brand} ${product.name}`}
                onPointerEnter={() => setHoverId(product.id)}
                onFocus={() => setHoverId(product.id)}
                className="group relative block w-24 shrink-0 cursor-pointer outline-none sm:w-28"
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
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-center">
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
        <Link
          to="/produit/$id"
          params={{ id: active.id }}
          className="btn-base btn-dark mt-2 w-full max-w-xs sm:w-auto"
        >
          Voir le produit
        </Link>
      </div>
    </div>
  );
}
