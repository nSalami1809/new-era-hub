import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import type { ProductInput } from "@/lib/api/products";
import { useCategories } from "@/lib/api/categories";
import { ImageUploader } from "@/components/ImageUploader";
import { formatPrice } from "@/lib/format";
import { useAddVariant, useRemoveVariant } from "@/lib/api/stock-variants";

const BLANK = {
  name: "",
  brand: "",
  category: "",
  description: "",
  price: "",
  promotionalPrice: "",
  costPrice: "",
  stock: "0",
  lowStockThreshold: "3",
  sku: "",
  images: [] as string[],
  isActive: true,
  isFeatured: false,
};

type Errors = Partial<
  Record<
    "name" | "brand" | "category" | "price" | "sku" | "images" | "promotionalPrice" | "costPrice",
    string
  >
>;

export function ProductForm({
  product,
  onSubmit,
  submitLabel,
}: {
  product?: Product;
  onSubmit: (input: ProductInput) => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description,
          price: String(product.price),
          promotionalPrice: product.promotionalPrice ? String(product.promotionalPrice) : "",
          costPrice: product.costPrice ? String(product.costPrice) : "",
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
          sku: product.sku,
          images: product.images,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        }
      : BLANK,
  );
  const [errors, setErrors] = useState<Errors>({});
  const hasSizes = (product?.variants.length ?? 0) > 0;
  const { data: categories = [] } = useCategories();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Once categories have loaded, default a brand-new product to the first one
  // instead of leaving the select empty.
  const firstCategory = categories[0]?.name;
  if (!product && !form.category && firstCategory) {
    set("category", firstCategory);
  }

  const priceNum = Number(form.price);
  const promoNum = form.promotionalPrice ? Number(form.promotionalPrice) : null;
  const costNum = form.costPrice ? Number(form.costPrice) : 0;
  const effectivePrice = promoNum && promoNum > 0 && promoNum < priceNum ? promoNum : priceNum;
  const marginHint =
    form.costPrice && Number.isFinite(effectivePrice) && effectivePrice > 0
      ? `Marge : ${formatPrice(effectivePrice - costNum)} (${Math.round(((effectivePrice - costNum) / effectivePrice) * 100)}%)`
      : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const promo = form.promotionalPrice ? Number(form.promotionalPrice) : null;
    const costPrice = form.costPrice ? Number(form.costPrice) : 0;
    const err: Errors = {};
    if (form.name.trim().length < 2) err.name = "Nom requis.";
    if (form.brand.trim().length < 2) err.brand = "Marque requise.";
    if (!form.category) err.category = "Catégorie requise.";
    if (!Number.isFinite(price) || price <= 0) err.price = "Prix invalide.";
    if (promo !== null && (!Number.isFinite(promo) || promo <= 0 || promo >= price))
      err.promotionalPrice = "Le prix promotionnel doit être inférieur au prix normal.";
    if (form.costPrice && (!Number.isFinite(costPrice) || costPrice < 0))
      err.costPrice = "Prix d'achat invalide.";
    if (form.sku.trim().length < 2) err.sku = "Référence requise.";
    if (form.images.length === 0) err.images = "Au moins une image est requise.";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      brand: form.brand.trim().toUpperCase(),
      category: form.category,
      description: form.description.trim(),
      price,
      promotionalPrice: promo,
      costPrice,
      // Multi-buy bundle promos are configured from the Promotions page, not
      // this form — pass through the existing values untouched.
      bundleQuantity: product?.bundleQuantity ?? null,
      bundlePrice: product?.bundlePrice ?? null,
      bundleActive: product?.bundleActive ?? false,
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      lowStockThreshold: Math.max(0, Math.round(Number(form.lowStockThreshold) || 0)),
      sku: form.sku.trim().toUpperCase(),
      images: form.images,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text
          id="name"
          label="Nom"
          value={form.name}
          onChange={(v) => set("name", v)}
          error={errors.name}
        />
        <Text
          id="brand"
          label="Marque"
          value={form.brand}
          onChange={(v) => set("brand", v)}
          error={errors.brand}
        />
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium">
            Catégorie
          </label>
          <select
            id="category"
            className="field"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {!form.category && <option value="">Sélectionner...</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-destructive">{errors.category}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Pour ajouter une nouvelle catégorie, rendez-vous dans Produits → Catégories.
          </p>
        </div>
        <Text
          id="price"
          label="Prix"
          type="number"
          value={form.price}
          onChange={(v) => set("price", v)}
          error={errors.price}
        />
        <Text
          id="promotionalPrice"
          label="Prix promotionnel (vide si aucune promotion)"
          type="number"
          value={form.promotionalPrice}
          onChange={(v) => set("promotionalPrice", v)}
          error={errors.promotionalPrice}
        />
        <div>
          <Text
            id="costPrice"
            label="Prix d'achat (pour le calcul de bénéfice)"
            type="number"
            value={form.costPrice}
            onChange={(v) => set("costPrice", v)}
            error={errors.costPrice}
          />
          {marginHint && <p className="mt-1 text-xs text-muted-foreground">{marginHint}</p>}
        </div>
        <div>
          <Text
            id="stock"
            label="Stock"
            type="number"
            value={form.stock}
            onChange={(v) => set("stock", v)}
            disabled={hasSizes}
          />
          {hasSizes && (
            <p className="mt-1 text-xs text-muted-foreground">
              Calculé automatiquement à partir des tailles ci-dessous.
            </p>
          )}
        </div>
        <Text
          id="lowStockThreshold"
          label="Seuil d'alerte stock"
          type="number"
          value={form.lowStockThreshold}
          onChange={(v) => set("lowStockThreshold", v)}
        />
        <Text
          id="sku"
          label="Référence"
          value={form.sku}
          onChange={(v) => set("sku", v)}
          error={errors.sku}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          className="field"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <ImageUploader
        images={form.images}
        onChange={(images) => set("images", images)}
        error={errors.images}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Tailles</label>
        {product ? (
          <VariantsSection product={product} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Enregistrez d'abord le produit pour pouvoir ajouter des tailles.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Produit actif (visible sur le site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => set("isFeatured", e.target.checked)}
          />
          Mettre en avant sur l'accueil
        </label>
      </div>

      <button type="submit" className="btn-base btn-success">
        {submitLabel}
      </button>
    </form>
  );
}

function VariantsSection({ product }: { product: Product }) {
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("0");
  const addVariant = useAddVariant();
  const removeVariant = useRemoveVariant();

  function add(e: React.FormEvent) {
    e.preventDefault();
    const size = newSize.trim();
    if (!size) return;
    addVariant.mutate(
      { productId: product.id, size, initialStock: Math.max(0, Math.round(Number(newStock) || 0)) },
      {
        onSuccess: () => {
          setNewSize("");
          setNewStock("0");
        },
      },
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Chaque taille a son propre stock. Le stock total du produit est calculé automatiquement.
      </p>
      {product.variants.length > 0 && (
        <ul className="mb-3 divide-y divide-border border border-border">
          {product.variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
              <span>
                <strong>{v.size}</strong> — {v.stock} en stock
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeVariant.mutate(v.id)}
                aria-label={`Supprimer la taille ${v.size}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="new-variant-size" className="mb-1 block text-xs text-muted-foreground">
            Taille
          </label>
          <input
            id="new-variant-size"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            placeholder="M"
            className="field !min-h-9 w-24"
          />
        </div>
        <div>
          <label htmlFor="new-variant-stock" className="mb-1 block text-xs text-muted-foreground">
            Stock initial
          </label>
          <input
            id="new-variant-stock"
            type="number"
            min={0}
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            className="field !min-h-9 w-24"
          />
        </div>
        <button
          type="submit"
          disabled={addVariant.isPending || !newSize.trim()}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}

function Text({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        disabled={disabled}
        className={`field ${error ? "border-destructive" : ""} ${disabled ? "opacity-60" : ""}`}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
