import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PriceTag, StockBadge, isNewProduct } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Stamp } from "@/components/Stamp";
import { addToCart, cartQuantity, setCartQuantity, useCart } from "@/lib/cart";
import { discountPercent, type Product } from "@/lib/types";

// Légers angles de repos fixes (pas aléatoires) pour un rendu stable entre le
// rendu serveur et l'hydratation, et identique à chaque chargement de page.
const REST_ANGLES = [-7, 5, -4, 8, -6, 4, -8, 6, -5, 7];

/** Casquettes "suspendues" sur une tringle — survoler (ou donner le focus au
 * clavier) en redresse une au premier plan pour un aperçu ; cliquer ouvre un
 * aperçu rapide en plein écran (photo, infos, panier) sans quitter la page.
 * Transitions CSS pures, pas de simulation physique. */
export function CapRail({ items, currency }: { items: Product[]; currency: string }) {
  useCart(); // se réabonne pour re-rendre quand le panier change (ajout, +/-)
  const [hoverId, setHoverId] = useState<string | null>(items[0]?.id ?? null);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((p) => p.id === hoverId) ?? items[0] ?? null;
  const opened = items.find((p) => p.id === openId) ?? null;

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
              <button
                key={product.id}
                type="button"
                aria-label={`Aperçu rapide — ${product.brand} ${product.name}`}
                onPointerEnter={() => setHoverId(product.id)}
                onFocus={() => setHoverId(product.id)}
                onClick={() => setOpenId(product.id)}
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
        <button
          type="button"
          onClick={() => setOpenId(active.id)}
          className="btn-base btn-dark mt-2 w-full max-w-xs sm:w-auto"
        >
          Aperçu rapide
        </button>
      </div>

      {opened && <QuickView product={opened} currency={currency} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function QuickView({
  product,
  currency,
  onClose,
}: {
  product: Product;
  currency: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = original;
    };
  }, [onClose]);

  if (!mounted) return null;

  const out = product.stock <= 0;
  const hasVariants = product.variants.length > 0;
  const qty = cartQuantity(product.id, null);
  const percent = discountPercent(product);
  const isNew = !out && percent === null && isNewProduct(product);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.brand} ${product.name}`}
      className="animate-in fade-in fixed inset-0 z-50 bg-black/60 duration-150 sm:grid sm:place-items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 relative flex h-full w-full flex-col overflow-y-auto bg-background duration-200 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:flex-row sm:rounded-3xl sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-muted"
        >
          <X size={20} />
        </button>

        <div className="aspect-square w-full shrink-0 bg-white sm:w-1/2">
          <ProductImage
            src={product.images[0]}
            alt={`${product.brand} ${product.name}`}
            priority
            width={500}
            className="h-full w-full object-contain p-8"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5 sm:w-1/2 sm:p-8">
          {out ? (
            <Stamp tone="danger" className="self-start">
              Rupture
            </Stamp>
          ) : percent !== null ? (
            <Stamp tone="danger" className="self-start">
              -{percent}%
            </Stamp>
          ) : isNew ? (
            <Stamp tone="accent" className="self-start">
              Nouveau
            </Stamp>
          ) : null}
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {product.brand}
          </span>
          <h3 className="text-2xl font-bold">{product.name}</h3>
          <PriceTag product={product} currency={currency} size="lg" />
          <StockBadge product={product} />
          {product.description && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
          )}

          <div className="mt-2 flex flex-col gap-2.5">
            {hasVariants ? (
              <Link
                to="/produit/$id"
                params={{ id: product.id }}
                onClick={onClose}
                className="btn-base btn-dark w-full"
              >
                {out ? "Indisponible" : "Choisir une option"}
              </Link>
            ) : qty > 0 ? (
              <div className="btn-base btn-success w-full !justify-between !px-0">
                <button
                  type="button"
                  aria-label={`Diminuer la quantité de ${product.name}`}
                  className="flex h-full items-center justify-center px-4"
                  onClick={() => setCartQuantity(product.id, null, qty - 1, product.stock)}
                >
                  −
                </button>
                <span aria-live="polite" className="text-base font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`Augmenter la quantité de ${product.name}`}
                  disabled={qty >= product.stock}
                  className="flex h-full items-center justify-center px-4 disabled:opacity-50"
                  onClick={() => setCartQuantity(product.id, null, qty + 1, product.stock)}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={out}
                onClick={() => addToCart(product.id, null, 1, product.stock)}
                className="btn-base btn-success w-full"
              >
                {out ? "Indisponible" : "Ajouter au panier"}
              </button>
            )}
            <Link
              to="/produit/$id"
              params={{ id: product.id }}
              onClick={onClose}
              className="btn-base btn-outline w-full"
            >
              Voir la fiche complète
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
