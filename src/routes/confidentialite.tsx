import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité | New Era Hub 241" },
      { name: "description", content: "Politique de confidentialité de la boutique." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const { data: settings } = useSettings();
  const storeName = settings?.storeName ?? "New Era Hub 241";

  return (
    <SiteLayout>
      <div className="container-page max-w-2xl py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl">Politique de confidentialité</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cette politique explique quelles données à caractère personnel {storeName} collecte
          lorsque vous utilisez ce site, pourquoi, et comment vous pouvez exercer vos droits.
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            1. Responsable du traitement
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le responsable du traitement des données collectées sur ce site est {storeName}
            {settings?.address ? <>, {settings.address}</> : ""}.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">2. Données collectées</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Lors d'une commande, nous collectons uniquement les informations nécessaires à son
            traitement et à sa livraison : nom, prénom, numéro de téléphone, lieu de livraison et,
            si vous le précisez, une adresse détaillée. Aucune création de compte n'est nécessaire
            pour commander.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Si vous laissez un avis produit ou demandez à être prévenu d'un réapprovisionnement,
            nous conservons le nom et/ou le numéro de téléphone que vous indiquez, pour cet usage
            précis uniquement.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            3. Finalités et base légale du traitement
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vos données sont traitées pour exécuter votre commande (préparation, livraison, contact
            via WhatsApp), répondre à vos demandes, et assurer le suivi des avis et alertes de
            stock. Ce traitement est fondé sur l'exécution de la commande que vous passez ou sur
            votre consentement lorsque vous soumettez un avis ou une alerte.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            4. Destinataires des données
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vos données ne sont ni vendues ni partagées à des fins commerciales avec des tiers.
            Elles sont uniquement accessibles à {storeName} et à ses prestataires techniques
            d'hébergement (Supabase, Vercel), qui n'y accèdent que pour assurer le fonctionnement du
            site.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">5. Paiement</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le paiement est finalisé directement avec {storeName} via WhatsApp, en dehors de ce
            site. Aucune information bancaire ou de carte de paiement n'est saisie, transmise ou
            stockée sur ce site.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">6. Durée de conservation</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Les données liées à une commande sont conservées pendant la durée nécessaire à son
            traitement, puis archivées le temps requis par nos obligations comptables. Les demandes
            d'alerte de réapprovisionnement sont supprimées dès que vous êtes recontacté.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">7. Sécurité</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vos données sont hébergées de manière sécurisée chez notre prestataire technique et
            protégées par des mécanismes de contrôle d'accès : seuls les administrateurs habilités
            de {storeName} peuvent consulter les informations de commande.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            8. Cookies et stockage local
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ce site utilise le stockage local de votre navigateur uniquement pour mémoriser le
            contenu de votre panier d'une visite à l'autre. Nous n'utilisons ni cookie publicitaire
            ni outil de suivi tiers.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">9. Vos droits</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition
            concernant les données vous concernant. Pour l'exercer, contactez-nous
            {settings?.email ? <> par email à {settings.email}</> : ""}
            {settings?.whatsappNumber ? <> ou via WhatsApp</> : ""}.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">10. Modifications</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cette politique peut être mise à jour à tout moment, notamment pour refléter une
            évolution du site ou de la réglementation. La version en ligne fait foi.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
