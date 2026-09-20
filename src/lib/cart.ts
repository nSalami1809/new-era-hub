import { useSyncExternalStore } from "react";
import { toast } from "@/lib/toast";
import { quantityTotal, type CartItem, type Product } from "@/lib/types";

const KEY = "neh241.cart.v1";

function readInitialCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

let cart: CartItem[] = readInitialCart();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* quota / private mode */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const emptyCart: CartItem[] = [];

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    subscribe,
    () => cart,
    () => emptyCart,
  );
}

/** Two cart lines are "the same" if they're the same product AND the same size (or both sizeless). */
function sameLine(
  a: { productId: string; variantId: string | null },
  productId: string,
  variantId: string | null,
) {
  return a.productId === productId && (a.variantId ?? null) === (variantId ?? null);
}

export function cartQuantity(productId: string, variantId: string | null = null): number {
  return cart.find((i) => sameLine(i, productId, variantId))?.quantity ?? 0;
}

export function cartCount(items: CartItem[] = cart): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/**
 * The cart only ever stores product/variant ids + quantities. `availableStock`
 * is passed in by the caller (who already has live product/variant data from
 * a query) so this module stays free of any server round-trip — the real
 * stock check that matters happens again, authoritatively, in `create_order`
 * at checkout.
 */
export function addToCart(
  productId: string,
  variantId: string | null,
  quantity: number,
  availableStock: number,
): boolean {
  if (availableStock <= 0) {
    toast("Ce produit est en rupture de stock.", "error");
    return false;
  }
  const current = cartQuantity(productId, variantId);
  if (current + quantity > availableStock) {
    toast(`Désolé, il ne reste que ${availableStock} exemplaire(s) de ce produit.`, "error");
    return false;
  }
  const exists = cart.some((i) => sameLine(i, productId, variantId));
  cart = exists
    ? cart.map((i) =>
        sameLine(i, productId, variantId) ? { ...i, quantity: i.quantity + quantity } : i,
      )
    : [...cart, { productId, variantId, quantity }];
  persist();
  emit();
  toast("Produit ajouté au panier.");
  return true;
}

export function setCartQuantity(
  productId: string,
  variantId: string | null,
  quantity: number,
  availableStock: number,
) {
  if (quantity <= 0) {
    removeFromCart(productId, variantId);
    return;
  }
  let next = quantity;
  if (next > availableStock) {
    toast(`Stock insuffisant : il ne reste que ${availableStock} exemplaire(s).`, "error");
    next = availableStock;
  }
  cart = cart.map((i) => (sameLine(i, productId, variantId) ? { ...i, quantity: next } : i));
  persist();
  emit();
}

export function removeFromCart(productId: string, variantId: string | null = null) {
  cart = cart.filter((i) => !sameLine(i, productId, variantId));
  persist();
  emit();
  toast("Article retiré du panier.");
}

export function clearCart() {
  cart = [];
  persist();
  emit();
}

export function cartTotals(items: CartItem[], products: Product[]) {
  let subtotal = 0;
  let discount = 0;
  for (const item of items) {
    const p = products.find((x) => x.id === item.productId);
    if (!p) continue;
    const lineTotal = quantityTotal(p, item.quantity);
    subtotal += p.price * item.quantity;
    discount += p.price * item.quantity - lineTotal;
  }
  return { subtotal, discount, total: subtotal - discount };
}
