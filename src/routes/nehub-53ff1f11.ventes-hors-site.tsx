import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useProducts } from "@/lib/api/products";
import { useCategories } from "@/lib/api/categories";
import { useAdminOrders, useCreateOfflineSale, type OfflineSaleItem } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { toast } from "@/lib/toast";
import { effectivePrice, variantLabel, type Product } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/ventes-hors-site")({
  component: AdminOfflineSales,
});

type CartLine = Omit<OfflineSaleItem, "unitPrice"> & {
  key: string;
  unitPrice: number;
  productName: string;
  productBrand: string;
  variantLabel: string;
  availableStock: number;
};

function variantStock(p: Product, variantId: string | null): number {
  if (!variantId) return p.stock;
  return p.variants.find((v) => v.id === variantId)?.stock ?? 0;
}

function AdminOfflineSales() {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const createOfflineSale = useCreateOfflineSale();

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");

  const sellableProducts = useMemo(
    () => products.filter((p) => p.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const selectedProduct = sellableProducts.find((p) => p.id === productId) ?? null;

  function selectProduct(id: string) {
    setProductId(id);
    const p = sellableProducts.find((x) => x.id === id);
    setVariantId("");
    setUnitPrice(p ? String(effectivePrice(p)) : "");
  }

  function addToCart() {
    if (!selectedProduct) {
      setError("Choisissez un produit.");
      return;
    }
    const qty = Math.round(Number(quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Quantité invalide.");
      return;
    }
    const price = unitPrice === "" ? effectivePrice(selectedProduct) : Number(unitPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Prix invalide.");
      return;
    }
    if (selectedProduct.variants.length > 0 && !variantId) {
      setError("Choisissez une taille/couleur.");
      return;
    }
    const available = variantStock(selectedProduct, variantId || null);
    const alreadyInCart = cart
      .filter((l) => l.productId === selectedProduct.id && l.variantId === (variantId || null))
      .reduce((s, l) => s + l.quantity, 0);
    if (alreadyInCart + qty > available) {
      setError(`Stock insuffisant : il ne reste que ${available} exemplaire(s).`);
      return;
    }
    const variant = selectedProduct.variants.find((v) => v.id === variantId);
    const colorName = variant
      ? (selectedProduct.colors.find((c) => c.id === variant.colorId)?.name ?? null)
      : null;
    const sizeType =
      categories.find((c) => c.name === selectedProduct.category)?.sizeType ?? "none";

    setError("");
    setCart((c) => [
      ...c,
      {
        key: `${selectedProduct.id}-${variantId || "none"}-${Date.now()}`,
        productId: selectedProduct.id,
        variantId: variantId || null,
        quantity: qty,
        unitPrice: price,
        productName: selectedProduct.name,
        productBrand: selectedProduct.brand,
        variantLabel: variant ? variantLabel(colorName, variant.size, sizeType) : "",
        availableStock: available,
      },
    ]);
    setQuantity("1");
  }

  function removeLine(key: string) {
    setCart((c) => c.filter((l) => l.key !== key));
  }

  const total = cart.reduce((s, l) => s + (l.unitPrice ?? 0) * l.quantity, 0);

  function submit() {
    if (cart.length === 0) {
      setError("Ajoutez au moins un article.");
      return;
    }
    createOfflineSale.mutate(
      {
        items: cart.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        note: note.trim() || null,
      },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast(`Vente hors site #${result.orderNumber} enregistrée.`);
          setCart([]);
          setNote("");
          setError("");
        },
      },
    );
  }

  const offlineSales = useMemo(
    () =>
      orders
        .filter((o) => o.channel === "offline")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders],
  );

  function exportCsv() {
    downloadCsv(
      `ventes-hors-site-${new Date().toISOString().slice(0, 10)}.csv`,
      ["N°", "Date", "Articles", "Total", "Note"],
      offlineSales.map((o) => [
        o.orderNumber,
        formatDate(o.createdAt),
        o.items.map((i) => `${i.name} x${i.quantity}`).join(" + "),
        o.total,
        o.customer.note ?? "",
      ]),
    );
  }

  return (
    <div>
      <h1 className="text-2xl">Ventes hors site</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enregistre une vente faite en dehors du site (WhatsApp, en personne...) : le stock est
        décrémenté et la vente apparaît dans les statistiques comme une commande normale, marquée
        "hors site". Aucun paiement en ligne n'est nécessaire — la vente est déjà encaissée.
      </p>

      <div className="mt-6 max-w-3xl border border-border p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Ajouter un article</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="product" className="mb-1 block text-sm font-medium">
              Produit
            </label>
            <select
              id="product"
              className="field"
              value={productId}
              onChange={(e) => selectProduct(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {sellableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          {selectedProduct && selectedProduct.variants.length > 0 && (
            <div>
              <label htmlFor="variant" className="mb-1 block text-sm font-medium">
                Taille / couleur
              </label>
              <select
                id="variant"
                className="field"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {selectedProduct.variants.map((v) => {
                  const colorName =
                    selectedProduct.colors.find((c) => c.id === v.colorId)?.name ?? null;
                  const sizeType =
                    categories.find((c) => c.name === selectedProduct.category)?.sizeType ?? "none";
                  return (
                    <option key={v.id} value={v.id}>
                      {variantLabel(colorName, v.size, sizeType) || "Variante"} — {v.stock} en stock
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
              Quantité
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              className="field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="unitPrice" className="mb-1 block text-sm font-medium">
              Prix unitaire ({currency})
            </label>
            <input
              id="unitPrice"
              type="number"
              min={0}
              className="field"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Pré-rempli au prix du site, modifiable (vente négociée).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addToCart}
          disabled={!productId}
          className="btn-base btn-outline mt-3"
        >
          <Plus size={14} />
          Ajouter à la vente
        </button>

        {cart.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <ul className="divide-y divide-border">
              {cart.map((l) => (
                <li key={l.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">
                      {l.productBrand} {l.productName}
                      {l.variantLabel ? ` — ${l.variantLabel}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.quantity} × {formatPrice(l.unitPrice ?? 0, currency)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {formatPrice((l.unitPrice ?? 0) * l.quantity, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Retirer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>

            <label htmlFor="note" className="mb-1 mt-4 block text-sm font-medium">
              Note (facultatif)
            </label>
            <input
              id="note"
              className="field"
              placeholder="Vendu via WhatsApp à..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={createOfflineSale.isPending}
              className="btn-base btn-success mt-4 w-full"
            >
              Enregistrer la vente
            </button>
          </div>
        )}
        {error && cart.length === 0 && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">Historique des ventes hors site</h2>
        {offlineSales.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        )}
      </div>

      {ordersLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
      ) : offlineSales.length === 0 ? (
        <p className="mt-3 border border-border p-6 text-sm text-muted-foreground">
          Aucune vente hors site pour le moment.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">N°</th>
                <th className="p-3">Date</th>
                <th className="p-3">Articles</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Détail</th>
              </tr>
            </thead>
            <tbody>
              {offlineSales.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">#{o.orderNumber}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                  <td className="p-3">
                    {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </td>
                  <td className="p-3 text-right font-semibold">{formatPrice(o.total, currency)}</td>
                  <td className="p-3 text-right">
                    <Link
                      to="/nehub-53ff1f11/commandes/$id"
                      params={{ id: o.id }}
                      className="btn-base btn-outline !min-h-9 !px-2.5 !py-1.5 text-xs"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
