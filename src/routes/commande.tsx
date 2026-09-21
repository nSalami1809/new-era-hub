import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site";
import { formatPrice, isValidPhone } from "@/lib/format";
import { cartTotals, clearCart, useCart } from "@/lib/cart";
import { toast } from "@/lib/toast";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { useCreateOrder } from "@/lib/api/orders";
import { usePreviewPromoCode, type PromoPreview } from "@/lib/api/promo-codes";

export const Route = createFileRoute("/commande")({
  head: () => ({
    meta: [
      { title: "Finaliser la commande | New Era Hub 241" },
      {
        name: "description",
        content: "Renseignez vos informations de livraison pour générer votre facture.",
      },
      { property: "og:title", content: "Finaliser la commande | New Era Hub 241" },
      {
        property: "og:description",
        content: "Vos informations de livraison, puis paiement sur WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

type Errors = Partial<Record<"firstName" | "lastName" | "phone" | "deliveryLocation", string>>;

function CheckoutPage() {
  const cart = useCart();
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const createOrder = useCreateOrder();
  const previewPromo = usePreviewPromoCode();
  const navigate = useNavigate();
  const totals = cartTotals(cart, products);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    deliveryLocation: "",
    address: "",
    note: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoPreview | null>(null);

  const promoDiscount = promo?.valid ? promo.discount : 0;
  const finalTotal = Math.max(0, totals.total - promoDiscount);

  async function applyPromo() {
    if (!promoInput.trim()) return;
    const result = await previewPromo.mutateAsync({
      code: promoInput.trim(),
      subtotal: totals.total,
    });
    setPromo(result);
  }

  if (cart.length === 0) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="text-2xl">Votre panier est vide.</h1>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/boutique" className="btn-base btn-dark">
              Continuer mes achats
            </Link>
            <Link to="/" className="btn-base btn-outline">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (form.firstName.trim().length < 2) e.firstName = "Veuillez indiquer votre prénom.";
    if (form.lastName.trim().length < 2) e.lastName = "Veuillez indiquer votre nom.";
    if (!isValidPhone(form.phone)) e.phone = "Numéro invalide. Exemple : +241 06 05 63 66";
    if (form.deliveryLocation.trim().length < 2)
      e.deliveryLocation = "Indiquez votre lieu de livraison.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const result = await createOrder.mutateAsync({
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        deliveryLocation: form.deliveryLocation.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
      },
      items: cart,
      promoCode: promo?.valid ? promo.code : null,
    });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    clearCart();
    navigate({ to: "/facture/$id", params: { id: result.orderId } });
  }

  const currency = settings?.currency ?? "FCFA";

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Accueil
          </Link>{" "}
          /{" "}
          <Link to="/panier" className="hover:underline">
            Panier
          </Link>{" "}
          / <span className="text-foreground">Commande</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl">Vos informations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces informations servent uniquement à préparer et livrer votre commande.
        </p>

        <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="lastName"
              label="Nom"
              value={form.lastName}
              onChange={(v) => set("lastName", v)}
              error={errors.lastName}
              autoComplete="family-name"
            />
            <Field
              id="firstName"
              label="Prénom"
              value={form.firstName}
              onChange={(v) => set("firstName", v)}
              error={errors.firstName}
              autoComplete="given-name"
            />
            <Field
              id="phone"
              label="Numéro de téléphone"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              error={errors.phone}
              type="tel"
              autoComplete="tel"
              placeholder="+241 06 05 63 66"
            />
            <Field
              id="deliveryLocation"
              label="Lieu de livraison"
              value={form.deliveryLocation}
              onChange={(v) => set("deliveryLocation", v)}
              error={errors.deliveryLocation}
              placeholder="Ville / quartier"
            />
            <div className="sm:col-span-2">
              <Field
                id="address"
                label="Adresse détaillée (facultatif)"
                value={form.address}
                onChange={(v) => set("address", v)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="note" className="mb-1 block text-sm font-medium">
                Précision de livraison (facultatif)
              </label>
              <textarea
                id="note"
                rows={3}
                className="field"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
              />
            </div>
          </div>

          <aside className="h-fit border border-border p-5">
            <h2 className="text-lg">Récapitulatif</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {cart.map((item) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                const variant = item.variantId
                  ? (p.variants.find((v) => v.id === item.variantId) ?? null)
                  : null;
                return (
                  <li
                    key={`${p.id}-${item.variantId ?? "base"}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-muted-foreground">
                      {p.brand} {p.name}
                      {variant ? ` (${variant.size})` : ""} × {item.quantity}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t border-border pt-3">
              <label htmlFor="promo-code" className="mb-1 block text-sm font-medium">
                Code promo
              </label>
              <div className="flex gap-2">
                <input
                  id="promo-code"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromo(null);
                  }}
                  placeholder="Entrez votre code"
                  className="field !min-h-9 flex-1 text-sm uppercase"
                />
                <button
                  type="button"
                  onClick={() => void applyPromo()}
                  disabled={previewPromo.isPending || !promoInput.trim()}
                  className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                >
                  Appliquer
                </button>
              </div>
              {promo && !promo.valid && (
                <p className="mt-1 text-xs text-destructive">{promo.message}</p>
              )}
              {promo?.valid && (
                <p className="mt-1 text-xs text-success">
                  Code « {promo.code} » appliqué : -{formatPrice(promo.discount, currency)}
                </p>
              )}
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sous-total</dt>
                <dd>{formatPrice(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Réduction</dt>
                <dd>{totals.discount > 0 ? `-${formatPrice(totals.discount, currency)}` : "—"}</dd>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Code promo</dt>
                  <dd className="text-success">-{formatPrice(promoDiscount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(finalTotal, currency)}</dd>
              </div>
            </dl>
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="btn-base btn-success mt-5 w-full"
            >
              Valider ma commande
            </button>
            <Link to="/panier" className="btn-base btn-outline mt-2 w-full">
              Retour au panier
            </Link>
          </aside>
        </form>
      </div>
    </SiteLayout>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
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
        placeholder={placeholder ?? ""}
        autoComplete={autoComplete ?? ""}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`field ${error ? "border-destructive" : ""}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
