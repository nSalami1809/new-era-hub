import { formatPrice } from "./format";
import {
  effectivePrice,
  variantLabel,
  type Order,
  type OrderStatus,
  type Product,
  type StoreSettings,
} from "./types";

// WhatsApp's own markdown uses a single asterisk for bold (not **), and
// renders on every client (mobile/desktop) without any HTML — this string is
// sent verbatim as the wa.me prefilled text.
export function buildWhatsappMessage(order: Order, settings: StoreSettings): string {
  const storeName = settings.storeName || "New Era Hub 241";
  const lines: string[] = [];
  lines.push(`👋 Bonjour *${storeName}* !`);
  lines.push("");
  lines.push("Je souhaite finaliser ma commande et procéder à son paiement 🛍️✨");
  lines.push("");
  lines.push(`📦 *Commande : #${order.orderNumber}*`);
  lines.push("");
  lines.push("👤 *Mes informations*");
  lines.push(`• Nom : ${order.customer.lastName}`);
  lines.push(`• Prénom : ${order.customer.firstName}`);
  lines.push(`• Téléphone : ${order.customer.phone}`);
  lines.push(`• 📍 Livraison : ${order.customer.deliveryLocation}`);
  if (order.customer.address) lines.push(`• Adresse : ${order.customer.address}`);
  if (order.customer.note) lines.push(`• Précision : ${order.customer.note}`);
  lines.push("");
  lines.push("🛒 *Ma commande*");
  for (const item of order.items) {
    const label = variantLabel(item.variantColor, item.variantSize);
    const variant = label ? ` (${label})` : "";
    lines.push(
      `• ${item.brand} ${item.name}${variant} × ${item.quantity} — ${formatPrice(
        item.unitPrice * item.quantity,
        settings.currency,
      )}`,
    );
  }
  lines.push("");
  if (order.discount > 0)
    lines.push(`🎁 *Réduction appliquée : -${formatPrice(order.discount, settings.currency)}*`);
  lines.push(`💰 *Total à payer : ${formatPrice(order.total, settings.currency)}*`);
  lines.push("");
  lines.push("Je suis prêt(e) à effectuer le paiement afin de confirmer ma commande. ✅");
  lines.push("");
  lines.push(`Merci pour votre assistance et à très bientôt chez *${storeName}* ! 🔥`);
  return lines.join("\n");
}

export function whatsappUrl(order: Order, settings: StoreSettings): string {
  const number = settings.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappMessage(order, settings))}`;
}

/** "Share this product" message + link — no fixed recipient, the person shares it with whoever they want. */
export function productShareText(product: Product, currency: string, url: string): string {
  return `${product.brand} ${product.name} — ${formatPrice(effectivePrice(product), currency)}\n${url}`;
}

export function productShareUrl(product: Product, currency: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(productShareText(product, currency, url))}`;
}

// Shown to the customer alongside the raw status name, one line of plain-
// language context per step of the order lifecycle.
const STATUS_DETAIL: Partial<Record<OrderStatus, string>> = {
  Contacté: "Nous vous avons contacté au sujet de votre commande.",
  "Paiement en attente": "Nous attendons votre paiement pour finaliser votre commande.",
  Payée: "Nous avons bien reçu votre paiement, merci !",
  "En préparation": "Votre commande est en cours de préparation.",
  Expédiée: "Votre commande a été expédiée, elle arrive bientôt.",
  Livrée: "Votre commande a été livrée. Merci pour votre confiance !",
  Annulée: "Votre commande a été annulée. N'hésitez pas à nous contacter pour plus d'informations.",
};

/** Sent to the CUSTOMER (not the store) every time an admin advances an order's status. */
export function buildOrderStatusMessage(order: Order, settings: StoreSettings): string {
  const storeName = settings.storeName || "New Era Hub 241";
  const detail = STATUS_DETAIL[order.status];
  const lines: string[] = [];
  lines.push(`👋 Bonjour ${order.customer.firstName},`);
  lines.push("");
  lines.push(`Mise à jour de votre commande *#${order.orderNumber}* chez *${storeName}* :`);
  lines.push("");
  lines.push(`📦 Nouveau statut : *${order.status}*`);
  if (detail) {
    lines.push("");
    lines.push(detail);
  }
  lines.push("");
  lines.push(`💰 Total : ${formatPrice(order.total, settings.currency)}`);
  lines.push("");
  lines.push(`Merci pour votre confiance ! 🙏`);
  return lines.join("\n");
}

export function orderStatusWhatsappUrl(order: Order, settings: StoreSettings): string {
  const number = order.customer.phone.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(buildOrderStatusMessage(order, settings))}`;
}
