import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Share2, X, ZoomIn } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductCard, PriceTag, StockBadge } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { addToCart } from "@/lib/cart";
import { isFavorite, toggleFavorite, useFavorites } from "@/lib/favorites";
import {
  productQueryOptions,
  productsQueryOptions,
  useProduct,
  useProducts,
} from "@/lib/api/products";
import { useCreateStockAlert } from "@/lib/api/stock-alerts";
import { useCreateReview, useProductReviews } from "@/lib/api/reviews";
import { settingsQueryOptions, useSettings } from "@/lib/api/settings";
import { categoriesQueryOptions, useCategories } from "@/lib/api/categories";
import { formatDate, formatPrice, isValidPhone } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import { StarRating, StarRatingInput } from "@/components/StarRating";
import { productShareText, productShareUrl } from "@/lib/whatsapp";
import { activeBundle, quantityTotal, sizeWord } from "@/lib/types";

export const Route = createFileRoute("/produit/$id")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productQueryOptions(params.id)),
      context.queryClient.ensureQueryData(settingsQueryOptions),
      context.queryClient.ensureQueryData(categoriesQueryOptions),
    ]);
    // Deliberately not awaited: the full catalog is only needed for the
    // below-the-fold "Produits similaires" section. Blocking the loader on
    // it delayed everything above the fold (photo, price, add-to-cart) by
    // however long that bigger query took — this way the product itself
    // renders as soon as its own data is ready, and similar products pop
    // in a moment later via the normal useProducts() loading state.
    void context.queryClient.prefetchQuery(productsQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Fiche produit | New Era Hub 241" },
      {
        name: "description",
        content: "Détail du produit : prix, disponibilité, description et ajout au panier.",
      },
      { property: "og:title", content: "Fiche produit | New Era Hub 241" },
      {
        property: "og:description",
        content: "Détail du produit : prix, disponibilité et description.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function StockAlertForm({ productId }: { productId: string }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const createAlert = useCreateStockAlert();

  if (sent) {
    return (
      <p className="text-sm text-success">
        Merci ! Nous vous préviendrons dès que ce produit sera de nouveau disponible.
      </p>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError("Numéro invalide. Exemple : +241 06 05 63 66");
      return;
    }
    createAlert.mutate({ productId, phone: phone.trim() }, { onSuccess: () => setSent(true) });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
      <div className="min-w-[180px] flex-1">
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError("");
          }}
          placeholder="Votre numéro WhatsApp"
          className={`field !min-h-11 ${error ? "border-destructive" : ""}`}
          aria-invalid={!!error}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={createAlert.isPending}
        className="btn-base btn-dark !min-h-11"
      >
        Me prévenir
      </button>
    </form>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const createReview = useCreateReview();

  if (sent) {
    return (
      <p className="mt-6 text-sm text-success">
        Merci pour votre avis ! Il sera publié après validation.
      </p>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Merci d'indiquer votre nom.");
      return;
    }
    createReview.mutate(
      { productId, authorName: name.trim(), rating, comment: comment.trim() },
      { onSuccess: () => setSent(true) },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 max-w-sm rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <h3 className="text-sm font-bold uppercase tracking-wide">Laisser un avis</h3>
      <div className="mt-3">
        <StarRatingInput value={rating} onChange={setRating} />
      </div>
      <label htmlFor="review-name" className="mt-3 mb-1 block text-sm font-medium">
        Votre nom
      </label>
      <input
        id="review-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
        className={`field ${error ? "border-destructive" : ""}`}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <label htmlFor="review-comment" className="mt-3 mb-1 block text-sm font-medium">
        Commentaire (facultatif)
      </label>
      <textarea
        id="review-comment"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="field"
      />
      <button
        type="submit"
        disabled={createReview.isPending}
        className="btn-base btn-dark mt-3 w-full"
      >
        Envoyer mon avis
      </button>
    </form>
  );
}

function ImageThumbnail({
  src,
  active,
  onClick,
  label,
}: {
  src: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-white transition-colors ${
        active ? "border-foreground" : "border-border hover:border-border-strong"
      }`}
    >
      {/* Requested at the cart's width (96), not this button's own 80px box:
          a visitor who clicks through color/photo thumbnails here and then
          adds to cart gets the exact same cached image in both places,
          instead of two near-identical resized copies. */}
      <ProductImage src={src} alt="" width={96} className="h-full w-full object-contain p-1.5" />
    </button>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useProduct(id);
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: reviews = [] } = useProductReviews(product?.id);
  useFavorites(); // subscribe so this page re-renders when the favorite state changes
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!zoomOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomOpen]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const hasColors = (product?.colors.length ?? 0) > 0;
  // Variants narrowed to the selected color — or every variant, for a
  // product that doesn't use colors at all.
  const variantsForColor = product
    ? hasColors
      ? product.variants.filter((v) => v.colorId === selectedColorId)
      : product.variants
    : [];
  const hasSizes = variantsForColor.some((v) => v.size !== null);
  const selectedVariant = hasSizes
    ? (variantsForColor.find((v) => v.size === selectedSize) ?? null)
    : (variantsForColor[0] ?? null);

  // Default the color to the first one with stock (falling back to simply
  // the first one) whenever the product loads or the current pick becomes
  // invalid — mirrors the equivalent size-only logic below.
  useEffect(() => {
    if (!product || !hasColors) return;
    if (product.colors.some((c) => c.id === selectedColorId)) return;
    const firstWithStock = product.colors.find((c) =>
      product.variants.some((v) => v.colorId === c.id && v.stock > 0),
    );
    setSelectedColorId(firstWithStock?.id ?? product.colors[0]!.id);
  }, [product, hasColors, selectedColorId]);

  useEffect(() => {
    setImageIndex(0);
  }, [selectedColorId]);

  useEffect(() => {
    if (!hasSizes) {
      if (selectedSize !== null) setSelectedSize(null);
      return;
    }
    if (variantsForColor.some((v) => v.size === selectedSize)) return;
    const firstInStock = variantsForColor.find((v) => v.stock > 0);
    setSelectedSize(firstInStock?.size ?? variantsForColor[0]?.size ?? null);
    // variantsForColor is derived from product + selectedColorId, both already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedColorId, hasSizes]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant?.id]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container-page py-6 sm:py-10">
          <Skeleton className="h-4 w-64 rounded-full" />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-3/4 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="mt-4 h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="mt-4 h-11 w-48 rounded-full" />
            </div>
          </div>
        </div>
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

  const hasVariants = product.variants.length > 0;
  const sizeType = categories.find((c) => c.name === product.category)?.sizeType ?? "none";
  const anyVariantInStock = hasVariants ? product.variants.some((v) => v.stock > 0) : true;
  const availableStock = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock;
  const out = hasVariants ? !anyVariantInStock : product.stock <= 0;
  const max = Math.max(1, availableStock);
  const selectedColor = hasColors
    ? (product.colors.find((c) => c.id === selectedColorId) ?? null)
    : null;
  const galleryImages =
    selectedColor && selectedColor.images.length > 0 ? selectedColor.images : product.images;
  const currency = settings?.currency ?? "FCFA";
  const bundle = activeBundle(product);
  const total = quantityTotal(product, quantity);
  const related = products
    .filter((p) => p.isActive && p.id !== product.id && p.category === product.category)
    .slice(0, 4);
  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product!.brand} ${product!.name}`,
          text: productShareText(product!, currency, url),
          url,
        });
      } catch {
        /* user cancelled the native share sheet */
      }
      return;
    }
    window.open(productShareUrl(product!, currency, url), "_blank", "noopener,noreferrer");
  }

  return (
    <SiteLayout>
      <div className="container-page py-6 sm:py-10">
        <Breadcrumb
          className="mb-5"
          items={[
            { label: "Accueil", to: "/" },
            { label: "Boutique", to: "/boutique" },
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Agrandir l'image"
              className="group relative block aspect-square w-full overflow-hidden rounded-3xl border border-border bg-white shadow-sm"
            >
              <ProductImage
                src={galleryImages[imageIndex] ?? galleryImages[0]}
                alt={`${product.brand} ${product.name}`}
                className="h-full w-full object-contain p-8"
                iconSize={40}
                priority
                width={600}
              />
              <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <ZoomIn size={14} />
                Agrandir
              </span>
            </button>
            {galleryImages.length > 1 && (
              <div className="mt-3 flex gap-3">
                {galleryImages.map((img, i) => (
                  <ImageThumbnail
                    key={img + i}
                    src={img}
                    active={i === imageIndex}
                    onClick={() => setImageIndex(i)}
                    label={`Voir l'image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {product.brand}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  aria-pressed={isFavorite(product.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Heart
                    size={14}
                    className={isFavorite(product.id) ? "fill-destructive text-destructive" : ""}
                  />
                  {isFavorite(product.id) ? "Favori" : "Ajouter aux favoris"}
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Share2 size={14} />
                  Partager
                </button>
              </div>
            </div>
            <h1 className="mt-1 text-3xl sm:text-4xl">{product.name}</h1>
            {avgRating !== null && (
              <div className="mt-1 flex items-center gap-2">
                <StarRating value={avgRating} />
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({reviews.length} avis)
                </span>
              </div>
            )}
            <div className="mt-4">
              <PriceTag product={product} currency={currency} size="lg" />
            </div>
            <div className="mt-2">
              <StockBadge product={product} />
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-y-2 border-y border-border py-4 text-sm">
              <dt className="text-muted-foreground">Référence</dt>
              <dd className="font-medium">{product.sku}</dd>
              <dt className="text-muted-foreground">Stock disponible</dt>
              <dd className="font-medium">{hasVariants ? availableStock : product.stock}</dd>
              <dt className="text-muted-foreground">Marque</dt>
              <dd className="font-medium">{product.brand}</dd>
            </dl>

            {out ? (
              <div className="mt-6">
                <p className="mb-1 font-semibold text-destructive">Rupture de stock</p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Laissez votre numéro WhatsApp, nous vous préviendrons dès le réapprovisionnement.
                </p>
                <StockAlertForm productId={product.id} />
              </div>
            ) : (
              <div className="mt-6">
                {hasColors && (
                  <div className="mb-4">
                    <span className="mb-2 block text-sm font-medium">
                      Couleur{selectedColor ? ` : ${selectedColor.name}` : ""}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((c) => {
                        const colorInStock = product.variants.some(
                          (v) => v.colorId === c.id && v.stock > 0,
                        );
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={!colorInStock}
                            onClick={() => setSelectedColorId(c.id)}
                            aria-label={c.name}
                            aria-pressed={selectedColorId === c.id}
                            title={c.name}
                            className={`h-10 w-10 overflow-hidden rounded-full border-2 bg-white transition-colors ${
                              selectedColorId === c.id
                                ? "border-foreground"
                                : "border-border hover:border-border-strong"
                            } ${!colorInStock ? "opacity-40" : ""}`}
                            style={c.hexColor ? { backgroundColor: c.hexColor } : undefined}
                          >
                            {!c.hexColor && (c.images[0] || product.images[0]) && (
                              <ProductImage
                                src={c.images[0] ?? product.images[0]}
                                alt=""
                                width={40}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hasSizes && (
                  <div className="mb-4">
                    <span className="mb-2 block text-sm font-medium">{sizeWord(sizeType)}</span>
                    <div className="flex flex-wrap gap-2">
                      {variantsForColor.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          disabled={v.stock <= 0}
                          onClick={() => setSelectedSize(v.size)}
                          className={`btn-base !min-h-9 !px-3 !py-1.5 text-sm ${
                            selectedSize === v.size ? "btn-dark" : "btn-outline"
                          } ${v.stock <= 0 ? "opacity-40 line-through" : ""}`}
                        >
                          {v.size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {bundle && (
                  <p className="mb-3 text-sm font-semibold text-success">
                    {bundle.quantity} pour {formatPrice(bundle.price, currency)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-full border border-border-strong">
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
                      disabled={hasVariants && !selectedVariant}
                      onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={hasVariants && !selectedVariant}
                    className="btn-base btn-success flex-1 sm:flex-none sm:px-8"
                    onClick={() =>
                      addToCart(
                        product.id,
                        hasVariants ? (selectedVariant?.id ?? null) : null,
                        quantity,
                        availableStock,
                      )
                    }
                  >
                    Ajouter au panier
                  </button>
                  <Link to="/panier" className="btn-base btn-outline">
                    Voir le panier
                  </Link>
                </div>
                {quantity > 1 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Total pour {quantity} :{" "}
                    <span className="font-semibold text-foreground">
                      {formatPrice(total, currency)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <section className="mt-12 max-w-2xl">
          <span className="eyebrow">Communauté</span>
          <h2 className="mt-1 mb-4 text-2xl sm:text-3xl">Avis clients</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun avis pour ce produit pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-4 shadow-sm">
              {reviews.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.authorName}</span>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                  {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
          <ReviewForm productId={product.id} />
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <span className="eyebrow">Vous aimerez aussi</span>
            <h2 className="mt-1 mb-4 text-2xl sm:text-3xl">Produits similaires</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} currency={currency} />
              ))}
            </div>
          </section>
        )}
      </div>

      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image agrandie"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Fermer"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            <X size={28} />
          </button>
          <ProductImage
            src={galleryImages[imageIndex] ?? galleryImages[0]}
            alt={`${product.brand} ${product.name}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
          {galleryImages.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {galleryImages.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex(i);
                  }}
                  aria-label={`Voir l'image ${i + 1}`}
                  className={`h-2 w-2 rounded-full ${i === imageIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </SiteLayout>
  );
}
