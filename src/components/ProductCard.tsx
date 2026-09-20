import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/format";
import { addToCart } from "@/lib/cart";
import { ProductImage } from "@/components/ProductImage";
import { discountPercent, effectivePrice, stockStatus, type Product } from "@/lib/types";

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product);
  if (status === "out") return <span className="text-xs font-medium text-destructive">Rupture de stock</span>;
  if (status === "low")
    return <span className="text-xs font-medium text-warning">Stock faible ({product.stock} restants)</span>;
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
  const main = size === "lg" ? "text-2xl" : "text-base";
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {percent !== null && (
        <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price, currency)}</span>
      )}
      <span className={`${main} font-bold`}>{formatPrice(effectivePrice(product), currency)}</span>
      {percent !== null && (
        <span className="rounded-sm bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
          -{percent}%
        </span>
      )}
    </div>
  );
}

export function ProductCard({ product, currency }: { product: Product; currency: string }) {
  const out = product.stock <= 0;
  return (
    <article className="flex flex-col border border-border bg-card">
      <Link
        to="/produit/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-white"
      >
        <ProductImage
          src={product.images[0]}
          alt={`${product.brand} ${product.name}`}
          className="h-full w-full object-contain p-4 transition-transform duration-200 hover:scale-[1.04] sm:p-6"
        />
        {out && (
          <span className="absolute left-0 top-0 bg-foreground px-2 py-1 text-xs font-semibold text-background">
            Rupture
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.brand}</span>
        <Link to="/produit/$id" params={{ id: product.id }} className="text-sm font-semibold leading-snug hover:underline sm:text-base">
          {product.name}
        </Link>
        <PriceTag product={product} currency={currency} />
        <StockBadge product={product} />
        <button
          type="button"
          disabled={out}
          onClick={() => addToCart(product.id, 1, product.stock)}
          className="btn-base btn-success mt-auto w-full"
        >
          {out ? "Indisponible" : "Ajouter au panier"}
        </button>
      </div>
    </article>
  );
}
