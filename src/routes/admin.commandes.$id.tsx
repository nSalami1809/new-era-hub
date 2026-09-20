import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminOrder, useUpdateOrderStatus } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/commandes/$id")({
  component: AdminOrderDetail,
});

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useAdminOrder(id);
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (!order) {
    return (
      <div>
        <h1 className="text-2xl">Commande introuvable</h1>
        <Link to="/admin/commandes" className="btn-base btn-outline mt-4">
          Retour aux commandes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/commandes" className="text-sm underline">
        ← Retour aux commandes
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Commande #{order.orderNumber}</h1>
        <select
          className="field !min-h-[38px] w-auto"
          value={order.status}
          disabled={updateStatus.isPending}
          onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
          <ul className="mt-2 space-y-1 text-sm">
            {order.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{h.status}</span>
                <span className="text-muted-foreground">{formatDate(h.at)}</span>
              </li>
            ))}
          </ul>
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
                    <img
                      src={item.image}
                      alt={`${item.brand} ${item.name}`}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 border border-border bg-white object-contain p-1"
                    />
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">{item.brand}</div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatPrice(item.unitPrice, currency)}</td>
                <td className="py-3 text-right font-semibold">{formatPrice(item.unitPrice * item.quantity, currency)}</td>
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
          <dt className="text-muted-foreground">Réduction</dt>
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
