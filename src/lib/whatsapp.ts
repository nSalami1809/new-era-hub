import { formatPrice } from "./format";
import { effectivePrice, type Order, type Product, type StoreSettings } from "./types";

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
    const variant = item.variantSize ? ` (Taille ${item.variantSize})` : "";
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
