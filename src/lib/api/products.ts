import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Product } from "@/lib/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductUpdateRow = Database["public"]["Tables"]["products"]["Update"];

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    description: row.description,
    price: Number(row.price),
    promotionalPrice: row.promotional_price !== null ? Number(row.promotional_price) : null,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    sold: row.sold,
    sku: row.sku,
    images: row.images ?? [],
    isActive: row.is_active,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "sold">;

function toUpdateRow(input: Partial<ProductInput>): ProductUpdateRow {
  const row: ProductUpdateRow = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.brand !== undefined) row.brand = input.brand;
  if (input.description !== undefined) row.description = input.description;
  if (input.price !== undefined) row.price = input.price;
  if (input.promotionalPrice !== undefined) row.promotional_price = input.promotionalPrice;
  if (input.lowStockThreshold !== undefined) row.low_stock_threshold = input.lowStockThreshold;
  if (input.sku !== undefined) row.sku = input.sku;
  if (input.images !== undefined) row.images = input.images;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.isFeatured !== undefined) row.is_featured = input.isFeatured;
  return row;
}

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export function useProducts(options?: Partial<UseQueryOptions<Product[]>>) {
  return useQuery({ queryKey: ["products"], queryFn: fetchProducts, ...options });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id as string),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      // Initial stock is set directly (there is no "previous" stock to log a
      // movement against yet) — every later change goes through adjust_stock.
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: input.name,
          brand: input.brand,
          description: input.description,
          price: input.price,
          promotional_price: input.promotionalPrice,
          stock: input.stock,
          low_stock_threshold: input.lowStockThreshold,
          sku: input.sku,
          images: input.images,
          is_active: input.isActive,
          is_featured: input.isFeatured,
        })
        .select()
        .single();
      if (error) throw error;
      return mapProduct(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      stockReason,
    }: {
      id: string;
      patch: Partial<ProductInput>;
      stockReason?: string;
    }) => {
      const { stock, ...rest } = patch;
      const row = toUpdateRow(rest);
      if (Object.keys(row).length > 0) {
        const { error } = await supabase.from("products").update(row).eq("id", id);
        if (error) throw error;
      }
      // Stock changes always go through adjust_stock so they stay audited in
      // stock_movements, whether triggered from the catalog form or elsewhere.
      if (stock !== undefined) {
        const { error } = await supabase.rpc("adjust_stock", {
          p_product_id: id,
          p_new_stock: stock,
          p_reason: stockReason ?? "Modification produit",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", variables.id] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
