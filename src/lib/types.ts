export type Product = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  promotionalPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  sold: number;
  sku: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = { productId: string; quantity: number };

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

export function stockStatus(p: Product): "in" | "low" | "out" {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.lowStockThreshold) return "low";
  return "in";
}
