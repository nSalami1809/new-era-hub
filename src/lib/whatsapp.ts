import { formatPrice } from "./format";
import type { Order, StoreSettings } from "./types";

export function buildWhatsappMessage(order: Order, settings: StoreSettings): string {
  const lines: string[] = [];
  lines.push("Bonjour, je souhaite procéder au paiement de ma commande.");
  lines.push("");
  lines.push(`Commande : #${order.orderNumber}`);
  lines.push("");
  lines.push("Client :");
  lines.push(`Nom : ${order.customer.lastName}`);
  lines.push(`Prénom : ${order.customer.firstName}`);
  lines.push(`Téléphone : ${order.customer.phone}`);
  lines.push(`Lieu de livraison : ${order.customer.deliveryLocation}`);
  if (order.customer.address) lines.push(`Adresse : ${order.customer.address}`);
  if (order.customer.note) lines.push(`Précision : ${order.customer.note}`);
  lines.push("");
  lines.push("Articles :");
  for (const item of order.items) {
    lines.push(
      `- ${item.brand} ${item.name} (${item.sku}) x ${item.quantity} — ${formatPrice(
        item.unitPrice * item.quantity,
        settings.currency,
      )}`,
    );
  }
  lines.push("");
  if (order.discount > 0) lines.push(`Réduction : -${formatPrice(order.discount, settings.currency)}`);
  lines.push(`Total : ${formatPrice(order.total, settings.currency)}`);
  lines.push("");
  lines.push("J'aimerais procéder au paiement.");
  lines.push("Merci.");
  return lines.join("\n");
}

export function whatsappUrl(order: Order, settings: StoreSettings): string {
  const number = settings.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappMessage(order, settings))}`;
}
