import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/types";
import type { Customer, Order, OrderItem, OrderStatus } from "@/lib/types";

type OrderItemRow = {
  product_id: string | null;
  name: string;
  brand: string;
  sku: string;
  image: string | null;
  unit_price: number;
  base_price: number;
  cost_price?: number;
  variant_size?: string | null;
  quantity: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  delivery_location: string;
  customer_address: string | null;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  promo_code?: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRow[];
  order_status_history?: { status: OrderStatus; at: string }[];
};

function mapOrderItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.product_id,
    name: row.name,
    brand: row.brand,
    sku: row.sku,
    image: row.image ?? "",
    unitPrice: Number(row.unit_price),
    basePrice: Number(row.base_price),
    costPrice: row.cost_price !== undefined ? Number(row.cost_price) : 0,
    variantSize: row.variant_size ?? null,
    quantity: row.quantity,
  };
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: {
      firstName: row.customer_first_name,
      lastName: row.customer_last_name,
      phone: row.customer_phone,
      deliveryLocation: row.delivery_location,
      ...(row.customer_address ? { address: row.customer_address } : {}),
      ...(row.customer_note ? { note: row.customer_note } : {}),
    },
    items: (row.order_items ?? []).map(mapOrderItem),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    promoCode: row.promo_code ?? null,
    status: row.status,
    history: (row.order_status_history ?? [])
      .map((h) => ({ status: h.status, at: h.at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export function useAdminOrders() {
  return useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => fetchOrder(id as string),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}

export type CreateOrderResult =
  { ok: true; orderId: string; orderNumber: string } | { ok: false; error: string };

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customer,
      items,
      promoCode,
    }: {
      customer: Customer;
      items: CartItem[];
      promoCode?: string | null;
    }): Promise<CreateOrderResult> => {
      const { data, error } = await supabase.rpc("create_order", {
        p_first_name: customer.firstName,
        p_last_name: customer.lastName,
        p_phone: customer.phone,
        p_delivery_location: customer.deliveryLocation,
        p_address: customer.address ?? "",
        p_note: customer.note ?? "",
        p_items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        ...(promoCode ? { p_promo_code: promoCode } : {}),
      });
      if (error) return { ok: false, error: error.message };
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return { ok: false, error: "La commande n'a pas pu être créée." };
      return { ok: true, orderId: row.order_id, orderNumber: row.order_number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

async function fetchOrderReceipt(ref: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc("get_order_receipt", { p_ref: ref });
  if (error) throw error;
  if (!data) return null;
  return mapOrder(data as OrderRow);
}

export function useOrderReceipt(ref: string | undefined) {
  return useQuery({
    queryKey: ["order-receipt", ref],
    queryFn: () => fetchOrderReceipt(ref as string),
    enabled: !!ref,
  });
}
