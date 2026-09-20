import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales | New Era Hub 241" },
      { name: "description", content: "Mentions légales de la boutique." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LegalNoticePage,
});

function LegalNoticePage() {
  const { data: settings } = useSettings();
  const storeName = settings?.storeName ?? "New Era Hub 241";

  return (
    <SiteLayout>
      <div className="container-page max-w-2xl py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl">Mentions légales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conformément à la réglementation en vigueur, les présentes mentions légales informent les
          utilisateurs du site {storeName} sur l'identité de l'éditeur et les conditions
          d'utilisation du site.
        </p>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">1. Éditeur du site</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le site {storeName} est édité par {storeName}.
            {settings?.address && (
              <>
                <br />
                Siège / adresse : {settings.address}
              </>
            )}
            {settings?.phone && (
              <>
                <br />
                Téléphone : {settings.phone}
              </>
            )}
            {settings?.email && (
              <>
                <br />
                Email : {settings.email}
              </>
            )}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">
            2. Directeur de la publication
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le directeur de la publication est le représentant légal de {storeName}, joignable aux
            coordonnées indiquées ci-dessus.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">3. Hébergement</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le site est hébergé par Vercel Inc. (vercel.com). Les images et fichiers du catalogue
            sont hébergés par Supabase Inc. (supabase.com).
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">4. Accès au site</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {storeName} met tout en œuvre pour assurer l'accès au site 24h/24 et 7j/7, sauf
            interruption programmée ou non pour maintenance. {storeName} ne saurait être tenu
            responsable de tout dommage lié à une indisponibilité temporaire du site.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">5. Propriété intellectuelle</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            L'ensemble des éléments présents sur ce site (textes, images, logos, visuels, mise en
            page) est la propriété exclusive de {storeName} ou de ses partenaires, sauf mention
            contraire, et est protégé par le droit de la propriété intellectuelle. Toute
            reproduction, représentation ou exploitation, totale ou partielle, sans autorisation
            écrite préalable, est interdite.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">6. Commandes et paiement</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Le site permet de constituer un panier et de transmettre une demande de commande. Aucun
            paiement n'est effectué sur le site : la commande est finalisée et le règlement convenu
            directement avec {storeName}, notamment par échange sur WhatsApp, avant expédition ou
            remise des produits.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">7. Responsabilité</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {storeName} s'efforce d'assurer l'exactitude et la mise à jour des informations
            diffusées sur ce site (disponibilité, prix, descriptions des produits) et se réserve le
            droit de les corriger dès que possible. {storeName} ne pourra être tenu responsable des
            erreurs, omissions ou de l'absence de disponibilité de certaines informations.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">8. Droit applicable</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Les présentes mentions légales sont soumises au droit sénégalais. En cas de litige et à
            défaut d'accord amiable, les tribunaux compétents seront ceux du ressort du siège de
            {storeName}.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">9. Contact</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter
            {settings?.email ? <> par email à {settings.email}</> : ""}
            {settings?.whatsappNumber ? <> ou via WhatsApp</> : ""}.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
