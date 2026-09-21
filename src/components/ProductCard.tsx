import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { addToCart, cartQuantity, setCartQuantity, useCart } from "@/lib/cart";
import { isFavorite, toggleFavorite, useFavorites } from "@/lib/favorites";
import { ProductImage } from "@/components/ProductImage";
import {
  activeBundle,
  discountPercent,
  effectivePrice,
  stockStatus,
  type Product,
} from "@/lib/types";

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product);
  if (status === "out")
    return <span className="text-xs font-medium text-destructive">Rupture de stock</span>;
  if (status === "low")
    return (
      <span className="text-xs font-medium text-warning">
        Stock faible ({product.stock} restants)
      </span>
    );
  return <span className="text-xs font-medium text-success">En stock</span>;
}

export function PriceTag({
  product,
  currency,
  size = "md",
}: {
  product: Product;
  currency: string;
  size?: "md" | "lg";
}) {
  const percent = discountPercent(product);
  const bundle = activeBundle(product);
  const main = size === "lg" ? "text-3xl" : "text-base";
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        {percent !== null && (
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(product.price, currency)}
          </span>
        )}
        <span className={`${main} font-bold`}>
          {formatPrice(effectivePrice(product), currency)}
        </span>
        {percent !== null && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
            -{percent}%
          </span>
        )}
      </div>
      {bundle && (
        <div className="mt-1 text-xs font-semibold text-success">
          {bundle.quantity} pour {formatPrice(bundle.price, currency)}
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  currency,
  priority = false,
}: {
  product: Product;
  currency: string;
  priority?: boolean;
}) {
  const out = product.stock <= 0;
  const hasVariants = product.variants.length > 0;
  useCart(); // subscribe so this card re-renders when its own quantity changes
  useFavorites(); // subscribe so this card re-renders when its own favorite state changes
  const qty = cartQuantity(product.id, null);
  const favorite = isFavorite(product.id);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link to="/produit/$id" params={{ id: product.id }} className="block h-full w-full">
          <ProductImage
            src={product.images[0]}
            alt={`${product.brand} ${product.name}`}
            priority={priority}
            width={300}
            className="h-full w-full object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:p-6"
          />
        </Link>
        {out && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
            Rupture
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={
            favorite ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`
          }
          aria-pressed={favorite}
          className="absolute right-2 top-2 rounded-full bg-background/90 p-2 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
        >
          <Heart
            size={18}
            className={favorite ? "fill-destructive text-destructive" : "text-muted-foreground"}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </span>
        <Link
          to="/produit/$id"
          params={{ id: product.id }}
          className="text-sm font-semibold leading-snug hover:underline sm:text-base"
        >
          {product.name}
        </Link>
        <PriceTag product={product} currency={currency} />
        <StockBadge product={product} />
        {hasVariants ? (
          <Link
            to="/produit/$id"
            params={{ id: product.id }}
            className="btn-base btn-outline mt-auto w-full"
          >
            {out ? "Indisponible" : "Choisir une option"}
          </Link>
        ) : qty > 0 ? (
          <div className="btn-base btn-success mt-auto w-full !justify-between !px-0">
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
            className="btn-base btn-success mt-auto w-full"
          >
            {out ? "Indisponible" : "Ajouter au panier"}
          </button>
        )}
      </div>
    </article>
  );
}
