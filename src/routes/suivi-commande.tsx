import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site";
import { Breadcrumb } from "@/components/Breadcrumb";

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
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = orderNumber.trim();
    if (!ref) {
      setError("Merci d'indiquer votre numéro de commande.");
      return;
    }
    navigate({ to: "/facture/$id", params: { id: ref } });
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
            Entrez le numéro de commande reçu lors de votre achat (ex : CMD-2026-0001) pour voir son
            statut.
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
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

          <button type="submit" className="btn-base btn-success mt-4 w-full">
            Voir ma commande
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
