import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Phone } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useOrderAccessToken } from "@/lib/api/orders";

export const Route = createFileRoute("/suivi-commande")({
  head: () => ({
    meta: [
      { title: "Suivre ma commande | New Era Hub 241" },
      {
        name: "description",
        content: "Retrouvez votre commande à partir de son numéro pour suivre son statut.",
      },
      { property: "og:title", content: "Suivre ma commande | New Era Hub 241" },
      { property: "og:description", content: "Retrouvez le statut de votre commande." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderLookupPage,
});

function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const getAccessToken = useOrderAccessToken();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = orderNumber.trim();
    const phoneRef = phone.trim();
    if (!ref || !phoneRef) {
      setError("Merci d'indiquer votre numéro de commande et votre téléphone.");
      return;
    }
    setError("");
    const token = await getAccessToken.mutateAsync({ orderNumber: ref, phone: phoneRef });
    if (!token) {
      // Same message whether the number or the phone is wrong, so this can
      // never be used to confirm a guessed order number.
      setError("Aucune commande ne correspond à ces informations.");
      return;
    }
    navigate({ to: "/facture/$id", params: { id: token } });
  }

  return (
    <SiteLayout>
      <div className="container-page flex justify-center py-12 sm:py-16">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
        >
          <Breadcrumb items={[{ label: "Accueil", to: "/" }, { label: "Suivre ma commande" }]} />
          <h1 className="text-2xl">Suivre ma commande</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrez le numéro de commande reçu lors de votre achat (ex : CMD-2026-0001) et le numéro
            de téléphone utilisé à la commande pour voir son statut.
          </p>

          <label htmlFor="order-number" className="mt-5 mb-1 block text-sm font-medium">
            Numéro de commande
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="order-number"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setError("");
              }}
              placeholder="CMD-2026-0001"
              className={`field pl-9 ${error ? "border-destructive" : ""}`}
              aria-invalid={!!error}
            />
          </div>

          <label htmlFor="order-phone" className="mt-4 mb-1 block text-sm font-medium">
            Téléphone utilisé à la commande
          </label>
          <div className="relative">
            <Phone
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="order-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              placeholder="074 00 00 00"
              className={`field pl-9 ${error ? "border-destructive" : ""}`}
              aria-invalid={!!error}
            />
          </div>
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={getAccessToken.isPending}
            className="btn-base btn-success mt-4 w-full"
          >
            Voir ma commande
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
