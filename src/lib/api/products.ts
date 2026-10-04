import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Product } from "@/lib/types";

type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductColorRow = Database["public"]["Tables"]["product_colors"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  product_variants?: ProductVariantRow[];
  product_colors?: ProductColorRow[];
};
type ProductUpdateRow = Database["public"]["Tables"]["products"]["Update"];

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    price: Number(row.price),
    promotionalPrice: row.promotional_price !== null ? Number(row.promotional_price) : null,
    costPrice: row.cost_price !== undefined && row.cost_price !== null ? Number(row.cost_price) : 0,
    bundleQuantity: row.bundle_quantity ?? null,
    bundlePrice:
      row.bundle_price !== null && row.bundle_price !== undefined ? Number(row.bundle_price) : null,
    bundleActive: row.bundle_active ?? false,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    sold: row.sold,
    sku: row.sku,
    images: row.images ?? [],
    isActive: row.is_active,
    isFeatured: row.is_featured,
    trackBySize: row.track_by_size,
    colors: (row.product_colors ?? [])
      .map((c) => ({
        id: c.id,
        name: c.name,
        hexColor: c.hex_color,
        images: c.images ?? [],
        sortOrder: c.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    variants: (row.product_variants ?? []).map((v) => ({
      id: v.id,
      size: v.size,
      colorId: v.color_id,
      stock: v.stock,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Variants and colors are managed through their own dedicated mutations
// (useAddVariant / useRemoveVariant / useAdjustVariantStock and
// useAddColor / useUpdateColor / useRemoveColor in stock-variants.ts), not
// through the generic product create/update path — there's no `variants` or
// `colors` column on `products` to map here.
export type ProductInput = Omit<
  Product,
  "id" | "createdAt" | "updatedAt" | "sold" | "variants" | "colors"
>;

function toUpdateRow(input: Partial<ProductInput>): ProductUpdateRow {
  const row: ProductUpdateRow = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.brand !== undefined) row.brand = input.brand;
  if (input.category !== undefined) row.category = input.category;
  if (input.description !== undefined) row.description = input.description;
  if (input.price !== undefined) row.price = input.price;
  if (input.promotionalPrice !== undefined) row.promotional_price = input.promotionalPrice;
  if (input.costPrice !== undefined) row.cost_price = input.costPrice;
  if (input.bundleQuantity !== undefined) row.bundle_quantity = input.bundleQuantity;
  if (input.bundlePrice !== undefined) row.bundle_price = input.bundlePrice;
  if (input.bundleActive !== undefined) row.bundle_active = input.bundleActive;
  if (input.lowStockThreshold !== undefined) row.low_stock_threshold = input.lowStockThreshold;
  if (input.sku !== undefined) row.sku = input.sku;
  if (input.images !== undefined) row.images = input.images;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.isFeatured !== undefined) row.is_featured = input.isFeatured;
  if (input.trackBySize !== undefined) row.track_by_size = input.trackBySize;
  return row;
}

// `cost_price` is deliberately not GRANTed to the `anon` Postgres role (see
// migration 20260920000010) so guests can never read margin data even via a
// crafted request — only `authenticated` (admin) has it. A plain `select("*")`
// asks for every column indiscriminately, and Postgres rejects the *entire*
// query when any one requested column isn't granted — so the storefront's
// guest-facing fetch must name its columns explicitly and leave cost_price
// out, while the admin-only variant below adds it back in for the
// authenticated session that's allowed to see it.
const PUBLIC_PRODUCT_COLUMNS =
  "id, name, brand, category, description, price, promotional_price, bundle_quantity, bundle_price, bundle_active, stock, low_stock_threshold, sold, sku, images, is_active, is_featured, track_by_size, created_at, updated_at, product_variants(*), product_colors(*)";
const ADMIN_PRODUCT_COLUMNS = `${PUBLIC_PRODUCT_COLUMNS}, cost_price`;

async function fetchProducts(columns: string): Promise<Product[]> {
  // A dynamic (non-literal) column string can't be statically matched against
  // the generated schema, so supabase-js falls back to a generic error-shaped
  // type here — cast back to what these two fixed column sets actually
  // return (verified against the schema, both include product_variants(*)).
  const { data, error } = await supabase
    .from("products")
    .select(columns)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

async function fetchProduct(id: string, columns: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(columns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

// Shared with route loaders (see e.g. routes/index.tsx, routes/boutique.tsx)
// so a loader's ensureQueryData(productsQueryOptions) and this hook's
// useQuery hit the exact same cache entry — the SSR-prefetched data renders
// immediately instead of the hook re-fetching after hydration. Storefront-
// facing: never requests cost_price, so it works for anonymous visitors.
export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: () => fetchProducts(PUBLIC_PRODUCT_COLUMNS),
});

export function productQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id, PUBLIC_PRODUCT_COLUMNS),
  });
}

export function useProducts() {
  return useQuery(productsQueryOptions);
}

export function useProduct(id: string | undefined) {
  return useQuery({ ...productQueryOptions(id ?? ""), enabled: !!id });
}

// Admin-only: includes cost_price for profit-margin displays. Only ever
// rendered inside the authenticated admin shell, whose session has the
// authenticated role's grant on that column.
export const adminProductsQueryOptions = queryOptions({
  queryKey: ["products", "admin"],
  queryFn: () => fetchProducts(ADMIN_PRODUCT_COLUMNS),
});

export function adminProductQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["products", id, "admin"],
    queryFn: () => fetchProduct(id, ADMIN_PRODUCT_COLUMNS),
  });
}

export function useAdminProducts() {
  return useQuery(adminProductsQueryOptions);
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({ ...adminProductQueryOptions(id ?? ""), enabled: !!id });
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
          category: input.category,
          description: input.description,
          price: input.price,
          promotional_price: input.promotionalPrice,
          cost_price: input.costPrice,
          bundle_quantity: input.bundleQuantity,
          bundle_price: input.bundlePrice,
          bundle_active: input.bundleActive,
          stock: input.stock,
          low_stock_threshold: input.lowStockThreshold,
          sku: input.sku,
          images: input.images,
          is_active: input.isActive,
          is_featured: input.isFeatured,
          track_by_size: input.trackBySize,
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
