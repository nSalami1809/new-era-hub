import { useState } from "react";
import type { Product } from "@/lib/types";
import type { ProductInput } from "@/lib/api/products";
import { ImageUploader } from "@/components/ImageUploader";

const BLANK = {
  name: "",
  brand: "",
  description: "",
  price: "",
  promotionalPrice: "",
  stock: "0",
  lowStockThreshold: "3",
  sku: "",
  images: [] as string[],
  isActive: true,
  isFeatured: false,
};

type Errors = Partial<Record<"name" | "brand" | "price" | "sku" | "images" | "promotionalPrice", string>>;

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
          description: product.description,
          price: String(product.price),
          promotionalPrice: product.promotionalPrice ? String(product.promotionalPrice) : "",
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

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const promo = form.promotionalPrice ? Number(form.promotionalPrice) : null;
    const err: Errors = {};
    if (form.name.trim().length < 2) err.name = "Nom requis.";
    if (form.brand.trim().length < 2) err.brand = "Marque requise.";
    if (!Number.isFinite(price) || price <= 0) err.price = "Prix invalide.";
    if (promo !== null && (!Number.isFinite(promo) || promo <= 0 || promo >= price))
      err.promotionalPrice = "Le prix promotionnel doit être inférieur au prix normal.";
    if (form.sku.trim().length < 2) err.sku = "Référence requise.";
    if (form.images.length === 0) err.images = "Au moins une image est requise.";
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      brand: form.brand.trim().toUpperCase(),
      description: form.description.trim(),
      price,
      promotionalPrice: promo,
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
        <Text id="name" label="Nom" value={form.name} onChange={(v) => set("name", v)} error={errors.name} />
        <Text id="brand" label="Marque" value={form.brand} onChange={(v) => set("brand", v)} error={errors.brand} />
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
        <Text id="stock" label="Stock" type="number" value={form.stock} onChange={(v) => set("stock", v)} />
        <Text
          id="lowStockThreshold"
          label="Seuil d'alerte stock"
          type="number"
          value={form.lowStockThreshold}
          onChange={(v) => set("lowStockThreshold", v)}
        />
        <Text id="sku" label="Référence" value={form.sku} onChange={(v) => set("sku", v)} error={errors.sku} />
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

      <ImageUploader images={form.images} onChange={(images) => set("images", images)} error={errors.images} />

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          Produit actif (visible sur le site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
          Mettre en avant sur l'accueil
        </label>
      </div>

      <button type="submit" className="btn-base btn-success">
        {submitLabel}
      </button>
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string;
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
        className={`field ${error ? "border-destructive" : ""}`}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
