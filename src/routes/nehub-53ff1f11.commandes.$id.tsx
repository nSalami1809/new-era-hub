import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminOrder, useUpdateOrderStatus } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { ORDER_STATUSES, variantLabel, type OrderStatus } from "@/lib/types";
import { orderStatusWhatsappUrl } from "@/lib/whatsapp";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/nehub-53ff1f11/commandes/$id")({
  component: AdminOrderDetail,
});

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useAdminOrder(id);
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-4 h-8 w-56" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <h1 className="text-2xl">Commande introuvable</h1>
        <Link to="/nehub-53ff1f11/commandes" className="btn-base btn-outline mt-4">
          Retour aux commandes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/nehub-53ff1f11/commandes"
        className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
      >
        <ArrowLeft size={14} />
        Retour aux commandes
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Commande #{order.orderNumber}</h1>
        <div className="flex items-center gap-2">
          {updateStatus.isPending && <Spinner size={16} />}
          <select
            className="field !min-h-[38px] w-auto"
            value={order.status}
            disabled={updateStatus.isPending}
            onChange={(e) => {
              const status = e.target.value as OrderStatus;
              if (
                status === "Annulée" &&
                !window.confirm(
                  "Annuler cette commande ? Le stock des articles sera automatiquement remis à jour.",
                )
              ) {
                return;
              }
              updateStatus.mutate(
                { id: order.id, status },
                {
                  onSuccess: () => {
                    if (!settings) return;
                    // No server-side WhatsApp API is configured — this opens a
                    // prefilled message to the customer's number, one tap from
                    // being sent, instead of a silent server-side send.
                    window.open(
                      orderStatusWhatsappUrl({ ...order, status }, settings),
                      "_blank",
                      "noopener,noreferrer",
                    );
                    toast("Statut mis à jour. Message WhatsApp prêt à envoyer au client.");
                  },
                },
              );
            }}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-border p-4">
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
            <p className="mt-2 text-sm text-muted-foreground">Précision : {order.customer.note}</p>
          )}
        </section>

        <section className="border border-border p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">Historique des statuts</h2>
          <div className="mt-3">
            <OrderStatusTimeline history={order.history} />
          </div>
        </section>
      </div>

      <div className="mt-6 overflow-x-auto border-t border-border">
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
                      width={56}
                      className="h-14 w-14 shrink-0 border border-border bg-white object-contain p-1"
                    />
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {item.brand}
                      </div>
                      <div className="font-medium">
                        {item.name}
                        {variantLabel(item.variantColor, item.variantSize, item.variantSizeKind)
                          ? ` — ${variantLabel(item.variantColor, item.variantSize, item.variantSizeKind)}`
                          : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatPrice(item.unitPrice, currency)}</td>
                <td className="py-3 text-right font-semibold">
                  {formatPrice(item.unitPrice * item.quantity, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Sous-total</dt>
          <dd>{formatPrice(order.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Réduction{order.promoCode ? ` (${order.promoCode})` : ""}
          </dt>
          <dd>{order.discount > 0 ? `-${formatPrice(order.discount, currency)}` : "—"}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(order.total, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}
