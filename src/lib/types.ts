// Categories are admin-manageable (see src/lib/api/categories.ts), not a
// fixed list — any non-empty string the admin has created is valid.
export type ProductCategory = string;

export type ProductVariant = {
  id: string;
  size: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  price: number;
  promotionalPrice: number | null;
  costPrice: number;
  bundleQuantity: number | null;
  bundlePrice: number | null;
  bundleActive: boolean;
  stock: number;
  lowStockThreshold: number;
  sold: number;
  sku: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  /** Optional per-size stock. Empty = this product doesn't use sizes. */
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type CartItem = { productId: string; variantId: string | null; quantity: number };

export type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  deliveryLocation: string;
  address?: string;
  note?: string;
};

export type OrderItem = {
  productId: string | null;
  name: string;
  brand: string;
  sku: string;
  image: string;
  unitPrice: number;
  basePrice: number;
  costPrice: number;
  variantSize: string | null;
  quantity: number;
};

export const ORDER_STATUSES = [
  "Nouvelle",
  "Contacté",
  "Paiement en attente",
  "Payée",
  "En préparation",
  "Expédiée",
  "Livrée",
  "Annulée",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
  id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  status: OrderStatus;
  history: { status: OrderStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  productId: string | null;
  productName: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: string;
  createdAt: string;
  adminId: string | null;
};

export type StoreSettings = {
  storeName: string;
  logoText: string;
  logoUrl: string | null;
  whatsappNumber: string;
  currency: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
  facebook: string;
};

export function effectivePrice(p: Product): number {
  return p.promotionalPrice && p.promotionalPrice < p.price ? p.promotionalPrice : p.price;
}

export function discountPercent(p: Product): number | null {
  if (!p.promotionalPrice || p.promotionalPrice >= p.price) return null;
  return Math.round(((p.price - p.promotionalPrice) / p.price) * 100);
}

/** Profit per unit at the current selling price (promo included), before any purchase. */
export function unitProfit(p: Product): number {
  return effectivePrice(p) - p.costPrice;
}

/** Profit margin (%) at the current selling price, or null if there's no price to divide by. */
export function profitMargin(p: Product): number | null {
  const price = effectivePrice(p);
  if (price <= 0) return null;
  return Math.round((unitProfit(p) / price) * 100);
}

export type ProductBundle = { quantity: number; price: number };

/** The active "buy N for a fixed price" promotion, or null if none is set/active. */
export function activeBundle(p: Product): ProductBundle | null {
  if (!p.bundleActive || !p.bundleQuantity || !p.bundlePrice) return null;
  return { quantity: p.bundleQuantity, price: p.bundlePrice };
}

/**
 * Total price for buying `qty` units of a product: full bundles are charged
 * at the bundle price, any remainder at the normal (or promotional) unit
 * price. Mirrors the pricing computed server-side in `create_order`.
 */
export function quantityTotal(p: Product, qty: number): number {
  const bundle = activeBundle(p);
  if (!bundle || qty < bundle.quantity) return effectivePrice(p) * qty;
  const bundles = Math.floor(qty / bundle.quantity);
  const remainder = qty % bundle.quantity;
  return bundles * bundle.price + remainder * effectivePrice(p);
}

export function stockStatus(p: Product): "in" | "low" | "out" {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.lowStockThreshold) return "low";
  return "in";
}
