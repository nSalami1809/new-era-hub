import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { ProductImage } from "@/components/ProductImage";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { Skeleton } from "@/components/Skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { useOrderReceipt } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { whatsappUrl } from "@/lib/whatsapp";
import logo from "@/assets/logo-new-era-hub-241.jpeg";

export const Route = createFileRoute("/facture/$id")({
  head: () => ({
    meta: [
      { title: "Facture de commande | New Era Hub 241" },
      { name: "description", content: "Récapitulatif de votre commande et paiement via WhatsApp." },
      { property: "og:title", content: "Facture de commande | New Era Hub 241" },
      {
        property: "og:description",
        content: "Récapitulatif de commande et lien de paiement WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useOrderReceipt(id);
  const { data: settings } = useSettings();

  if (isLoading || !settings) {
    return (
      <SiteLayout>
        <div className="container-page max-w-3xl py-8">
          <div className="border border-border p-5 sm:p-8">
            <div className="flex justify-between gap-4 border-b border-border pb-5">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="mt-5 h-24 w-full" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (!order) {
    return (
      <SiteLayout>
        <div className="container-page py-16 text-center">
          <h1 className="text-2xl">Commande introuvable.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez le numéro de commande, ou réessayez depuis la page de suivi.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/suivi-commande" className="btn-base btn-dark">
              Réessayer
            </Link>
            <Link to="/boutique" className="btn-base btn-outline">
              Retour à la boutique
            </Link>
            <Link to="/" className="btn-base btn-outline">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-page max-w-3xl py-8">
        <div className="border border-border p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <img src={logo} alt={settings.storeName} className="h-10 w-10 object-contain" />
                <span className="text-lg font-bold">{settings.storeName}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.address}
                <br />
                {settings.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground hover:underline"
                  >
                    {settings.phone || settings.whatsappNumber}
                  </a>
                ) : (
                  settings.phone
                )}
                {" · "}
                {settings.email ? (
                  <a
                    href={`mailto:${settings.email}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {settings.email}
                  </a>
                ) : null}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="text-lg font-bold">Commande #{order.orderNumber}</p>
              <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
              <p className="mt-1 inline-block border border-border px-2 py-0.5 text-xs font-semibold">
                {order.status}
              </p>
            </div>
          </div>

          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">Client</h2>
              <p className="mt-2 text-sm">
                {order.customer.lastName} {order.customer.firstName}
                <br />
                {order.customer.phone}
                <br />
                {order.customer.deliveryLocation}
                {order.customer.address ? (
                  <>
                    <br />
                    {order.customer.address}
                  </>
                ) : null}
              </p>
              {order.customer.note && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Précision : {order.customer.note}
                </p>
              )}
            </div>
            {order.history.length > 0 && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide">Suivi de la commande</h2>
                <div className="mt-3">
                  <OrderStatusTimeline history={order.history} />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Article</th>
                  <th className="py-2 text-center">Qté</th>
                  <th className="py-2 text-right">Prix unitaire</th>
                  <th className="py-2 text-right">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.productId ?? `${item.sku}-${i}`} className="border-b border-border">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={item.image}
                          alt={`${item.brand} ${item.name}`}
                          className="h-14 w-14 shrink-0 border border-border bg-white object-contain p-1"
                        />
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">
                            {item.brand}
                          </div>
                          <div className="font-medium">
                            {item.name}
                            {item.variantSize ? ` — Taille ${item.variantSize}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatPrice(item.unitPrice, settings.currency)}
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatPrice(item.unitPrice * item.quantity, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sous-total</dt>
              <dd>{formatPrice(order.subtotal, settings.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Réduction{order.promoCode ? ` (${order.promoCode})` : ""}
              </dt>
              <dd>
                {order.discount > 0 ? `-${formatPrice(order.discount, settings.currency)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total, settings.currency)}</dd>
            </div>
          </dl>
        </div>

        <a
          href={whatsappUrl(order, settings)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-base btn-success mt-5 w-full text-base print:hidden"
        >
          Procéder au paiement sur WhatsApp
        </a>
        <p className="mt-2 text-center text-xs text-muted-foreground print:hidden">
          Le message contient votre numéro de commande, vos informations et la liste des articles.
          Les photos des produits ne peuvent pas être jointes automatiquement.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <Link to="/boutique" className="btn-base btn-outline">
            Continuer mes achats
          </Link>
          <Link to="/" className="btn-base btn-outline">
            Retour à l'accueil
          </Link>
          <button type="button" className="btn-base btn-outline" onClick={() => window.print()}>
            Imprimer la facture
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}
