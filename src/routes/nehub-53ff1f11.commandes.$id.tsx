import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { ProofUploader } from "@/components/ProofUploader";
import { Skeleton } from "@/components/Skeleton";
import { Spinner } from "@/components/Spinner";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminOrder, useUpdateOfflineSaleInfo, useUpdateOrderStatus } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { ORDER_STATUSES, variantLabel, type Order, type OrderStatus } from "@/lib/types";
import { orderStatusWhatsappUrl } from "@/lib/whatsapp";
import { toast } from "@/lib/toast";

/** Formulaire d'édition des infos client d'une vente hors site — qui elle
 * est destinée, son contact, une précision. Non affiché pour les commandes
 * du site : leurs infos viennent du client lui-même au moment de la
 * commande, pas quelque chose que l'admin devrait réécrire. */
function EditOfflineCustomer({ order, onDone }: { order: Order; onDone: () => void }) {
  const [firstName, setFirstName] = useState(
    order.customer.firstName === "Vente" ? "" : order.customer.firstName,
  );
  const [lastName, setLastName] = useState(
    order.customer.lastName === "hors site" ? "" : order.customer.lastName,
  );
  const [phone, setPhone] = useState(order.customer.phone === "—" ? "" : order.customer.phone);
  const [note, setNote] = useState(order.customer.note ?? "");
  const [proofImageUrl, setProofImageUrl] = useState(order.proofImageUrl);
  const update = useUpdateOfflineSaleInfo();

  function save() {
    update.mutate(
      { id: order.id, firstName, lastName, phone, note, proofImageUrl },
      {
        onSuccess: () => {
          toast("Informations mises à jour.");
          onDone();
        },
      },
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-first-name" className="mb-1 block text-xs font-medium">
            Prénom
          </label>
          <input
            id="edit-first-name"
            className="field !min-h-9 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Vendu à..."
          />
        </div>
        <div>
          <label htmlFor="edit-last-name" className="mb-1 block text-xs font-medium">
            Nom
          </label>
          <input
            id="edit-last-name"
            className="field !min-h-9 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="edit-phone" className="mb-1 block text-xs font-medium">
          Téléphone
        </label>
        <input
          id="edit-phone"
          className="field !min-h-9 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="edit-note" className="mb-1 block text-xs font-medium">
          Précision
        </label>
        <input
          id="edit-note"
          className="field !min-h-9 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Vendu via WhatsApp à..."
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Justificatif de transaction</label>
        <ProofUploader value={proofImageUrl} onChange={setProofImageUrl} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="btn-base btn-success !min-h-9 !px-3 !py-1.5 text-xs"
        >
          {update.isPending && <Spinner size={13} />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={update.isPending}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/nehub-53ff1f11/commandes/$id")({
  component: AdminOrderDetail,
});

function AdminOrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useAdminOrder(id);
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const updateStatus = useUpdateOrderStatus();
  const [editingCustomer, setEditingCustomer] = useState(false);

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
        <h1 className="flex items-center gap-2 text-2xl">
          Commande #{order.orderNumber}
          {order.channel === "offline" && (
            <span className="bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hors site
            </span>
          )}
        </h1>
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide">Client</h2>
            {order.channel === "offline" && !editingCustomer && (
              <button
                type="button"
                onClick={() => setEditingCustomer(true)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Pencil size={12} />
                Modifier
              </button>
            )}
          </div>
          {editingCustomer ? (
            <EditOfflineCustomer order={order} onDone={() => setEditingCustomer(false)} />
          ) : (
            <>
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
              {order.proofImageUrl && (
                <a
                  href={order.proofImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ProductImage
                    src={order.proofImageUrl}
                    alt="Justificatif de transaction"
                    width={40}
                    className="h-10 w-10 rounded-md border border-border bg-white object-contain p-1"
                  />
                  Voir le justificatif de transaction
                </a>
              )}
            </>
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
