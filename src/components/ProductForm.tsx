import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  SIZE_PRESETS,
  sizeWord,
  type Product,
  type ProductColor,
  type SizeType,
} from "@/lib/types";
import type { ProductInput } from "@/lib/api/products";
import { useCategories } from "@/lib/api/categories";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductImage } from "@/components/ProductImage";
import { Spinner } from "@/components/Spinner";
import { formatPrice } from "@/lib/format";
import {
  useAddColor,
  useAddVariant,
  useAdjustVariantStock,
  useRemoveColor,
  useRemoveVariant,
  useUpdateColor,
} from "@/lib/api/stock-variants";

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
  const hasVariants = (product?.variants.length ?? 0) > 0;
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
  const sizeType: SizeType = categories.find((c) => c.name === form.category)?.sizeType ?? "none";

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
            disabled={hasVariants}
          />
          {hasVariants && (
            <p className="mt-1 text-xs text-muted-foreground">
              Calculé automatiquement à partir des tailles/couleurs ci-dessous.
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
        <label className="mb-1 block text-sm font-medium">
          {sizeType === "none" ? "Couleurs" : `Couleurs et ${sizeWord(sizeType).toLowerCase()}s`}
        </label>
        {product ? (
          <VariantsEditor product={product} sizeType={sizeType} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Enregistrez d'abord le produit pour pouvoir ajouter des couleurs et des{" "}
            {sizeWord(sizeType).toLowerCase()}s.
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

/**
 * Tap-to-set grid of preset sizes (Pointure 36-46 for shoes, Taille XS-XXXL
 * for clothing) for one dimension — either one color (colorId set) or the
 * whole product when it has no colors (colorId null). Typing a number in a
 * size's box creates/updates its stock on blur; a size stays visible (at 0)
 * once used so it can show as "out of stock" on the site rather than
 * vanishing — the × removes it entirely.
 */
function SizeGrid({
  product,
  colorId,
  sizeType,
}: {
  product: Product;
  colorId: string | null;
  sizeType: Exclude<SizeType, "none">;
}) {
  const addVariant = useAddVariant();
  const removeVariant = useRemoveVariant();
  const adjustStock = useAdjustVariantStock();
  const [showCustom, setShowCustom] = useState(false);
  const [customSize, setCustomSize] = useState("");

  const here = product.variants.filter((v) => v.colorId === colorId && v.size !== null);
  const preset = SIZE_PRESETS[sizeType];
  const extra = here.map((v) => v.size!).filter((s) => !preset.includes(s));
  const sizes = [...preset, ...extra];

  function variantFor(size: string) {
    return here.find((v) => v.size === size) ?? null;
  }

  function commit(size: string, raw: string) {
    const value = Math.max(0, Math.round(Number(raw) || 0));
    const existing = variantFor(size);
    if (!existing) {
      if (value <= 0) return;
      addVariant.mutate({ productId: product.id, size, colorId, initialStock: value });
      return;
    }
    if (value === existing.stock) return;
    adjustStock.mutate({ variantId: existing.id, newStock: value });
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const size = customSize.trim();
    if (!size) return;
    addVariant.mutate(
      { productId: product.id, size, colorId, initialStock: 0 },
      {
        onSuccess: () => {
          setCustomSize("");
          setShowCustom(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sizes.map((size) => {
        const v = variantFor(size);
        return (
          <div
            key={size}
            className="flex items-center overflow-hidden rounded border border-border"
          >
            <span className="px-2 py-1.5 text-xs font-medium">{size}</span>
            <input
              key={`${size}-${v?.stock ?? "new"}`}
              type="number"
              min={0}
              defaultValue={v?.stock ?? ""}
              placeholder="0"
              aria-label={`Stock ${sizeWord(sizeType)} ${size}`}
              onBlur={(e) => commit(size, e.target.value)}
              className="field !min-h-8 w-14 rounded-none border-0 border-l border-border text-right"
            />
            {v && (
              <button
                type="button"
                onClick={() => removeVariant.mutate(v.id)}
                aria-label={`Supprimer la taille ${size}`}
                className="px-1.5 text-muted-foreground hover:text-destructive"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      {showCustom ? (
        <form onSubmit={addCustom} className="flex items-center gap-1">
          <input
            autoFocus
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onBlur={() => {
              if (!customSize.trim()) setShowCustom(false);
            }}
            placeholder="Autre"
            className="field !min-h-8 w-16 text-xs"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="btn-base btn-outline !min-h-8 !px-2 !py-1 text-xs"
        >
          + Autre
        </button>
      )}
    </div>
  );
}

/** A color that doesn't need sizes (sizeType "none") just holds one stock number directly. */
function FlatColorStock({ product, color }: { product: Product; color: ProductColor }) {
  const addVariant = useAddVariant();
  const adjustStock = useAdjustVariantStock();
  const variant = product.variants.find((v) => v.colorId === color.id && v.size === null) ?? null;

  function commit(raw: string) {
    const value = Math.max(0, Math.round(Number(raw) || 0));
    if (!variant) {
      addVariant.mutate({
        productId: product.id,
        size: null,
        colorId: color.id,
        initialStock: value,
      });
      return;
    }
    if (value === variant.stock) return;
    adjustStock.mutate({ variantId: variant.id, newStock: value });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Stock
      <input
        key={variant?.stock ?? "new"}
        type="number"
        min={0}
        defaultValue={variant?.stock ?? ""}
        placeholder="0"
        onBlur={(e) => commit(e.target.value)}
        className="field !min-h-8 w-20 text-right"
      />
    </label>
  );
}

function NewColorForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const addColor = useAddColor();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addColor.mutate(
      {
        productId: product.id,
        name: trimmed,
        hexColor: hex || null,
        images,
        sortOrder: product.colors.length,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 border border-dashed border-border-strong p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="new-color-name" className="mb-1 block text-xs text-muted-foreground">
            Nom
          </label>
          <input
            id="new-color-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Noir"
            className="field !min-h-9 w-28"
          />
        </div>
        <div>
          <label htmlFor="new-color-hex" className="mb-1 block text-xs text-muted-foreground">
            Teinte
          </label>
          <input
            id="new-color-hex"
            type="color"
            value={hex || "#000000"}
            onChange={(e) => setHex(e.target.value)}
            className="field !h-9 !min-h-9 w-14 !p-1"
          />
        </div>
        <button
          type="submit"
          disabled={addColor.isPending || !name.trim()}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          {addColor.isPending && <Spinner size={14} />}
          Ajouter
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          Annuler
        </button>
      </div>
      <ImageUploader images={images} onChange={setImages} />
    </form>
  );
}

function ColorCard({
  product,
  color,
  sizeType,
}: {
  product: Product;
  color: ProductColor;
  sizeType: SizeType;
}) {
  const [editing, setEditing] = useState(false);
  const removeColor = useRemoveColor();

  if (editing) {
    return (
      <div className="border border-border p-3">
        <ColorEditForm color={color} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ColorSwatch color={color} />
          <strong className="text-sm">{color.name}</strong>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Modifier la couleur ${color.name}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Supprimer la couleur « ${color.name} » ? Son stock sera aussi supprimé.`,
                )
              ) {
                removeColor.mutate(color.id);
              }
            }}
            aria-label={`Supprimer la couleur ${color.name}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="mt-2.5">
        {sizeType === "none" ? (
          <FlatColorStock product={product} color={color} />
        ) : (
          <SizeGrid product={product} colorId={color.id} sizeType={sizeType} />
        )}
      </div>
    </div>
  );
}

/**
 * One place to manage colors and sizes, shaped by the product's category:
 * no size UI at all for a category that doesn't use sizes (caps, bags...),
 * a tap-to-set Pointure/Taille grid for one that does — per color once
 * colors are added, or directly on the product when it has none. Colors
 * stay optional for every category.
 */
function VariantsEditor({ product, sizeType }: { product: Product; sizeType: SizeType }) {
  const [addingColor, setAddingColor] = useState(false);
  const hasColors = product.colors.length > 0;
  const removeVariant = useRemoveVariant();
  // A category can be reclassified after sizes were added under the old
  // type — keep those visible (with a way to remove them) instead of
  // silently hiding stock-holding rows.
  const orphaned = sizeType === "none" ? product.variants.filter((v) => v.size !== null) : [];

  return (
    <div className="space-y-3">
      {orphaned.length > 0 && (
        <div className="border border-warning/50 bg-warning/10 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Cette catégorie n'utilise plus de tailles, mais ce produit en a encore :
          </p>
          <ul className="space-y-1">
            {orphaned.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {v.size} — {v.stock} en stock
                </span>
                <button
                  type="button"
                  onClick={() => removeVariant.mutate(v.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Supprimer la taille ${v.size}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sizeType !== "none" && !hasColors && (
        <SizeGrid product={product} colorId={null} sizeType={sizeType} />
      )}

      {hasColors && (
        <div className="space-y-3">
          {product.colors.map((c) => (
            <ColorCard key={c.id} product={product} color={c} sizeType={sizeType} />
          ))}
        </div>
      )}

      {addingColor ? (
        <NewColorForm product={product} onDone={() => setAddingColor(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAddingColor(true)}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          + Ajouter une couleur
        </button>
      )}
    </div>
  );
}

function ColorSwatch({ color }: { color: ProductColor }) {
  return (
    <span
      className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border bg-white"
      style={color.hexColor ? { backgroundColor: color.hexColor } : undefined}
    >
      {!color.hexColor && color.images[0] && (
        <ProductImage
          src={color.images[0]}
          alt=""
          width={24}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
}

function ColorEditForm({ color, onDone }: { color: ProductColor; onDone: () => void }) {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.hexColor ?? "");
  const [images, setImages] = useState(color.images);
  const updateColor = useUpdateColor();

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateColor.mutate(
      { colorId: color.id, name: name.trim(), hexColor: hex || null, images },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label
            htmlFor={`edit-color-name-${color.id}`}
            className="mb-1 block text-xs text-muted-foreground"
          >
            Nom
          </label>
          <input
            id={`edit-color-name-${color.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field !min-h-9 w-28"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-color-hex-${color.id}`}
            className="mb-1 block text-xs text-muted-foreground"
          >
            Teinte
          </label>
          <input
            id={`edit-color-hex-${color.id}`}
            type="color"
            value={hex || "#000000"}
            onChange={(e) => setHex(e.target.value)}
            className="field !h-9 !min-h-9 w-14 !p-1"
          />
        </div>
        <button
          type="submit"
          disabled={updateColor.isPending || !name.trim()}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          {updateColor.isPending && <Spinner size={14} />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          Annuler
        </button>
      </div>
      <ImageUploader images={images} onChange={setImages} />
    </form>
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
