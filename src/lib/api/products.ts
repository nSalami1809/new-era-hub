import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

// ---------------------------------------------------------------------------
// Server-side pagination (ID-2): a deliberately SEPARATE set of hooks from
// useProducts/useAdminProducts above, which stay full-scan fetches for the
// many consumers that need the whole catalog (cart/checkout resolving an
// arbitrary id, header search suggestions, dashboard/comptabilité/alerts
// aggregations, "pick any product" selectors...). Only the boutique and the
// admin Produits list — the two screens that actually render one page at a
// time — use these.
// ---------------------------------------------------------------------------

export type ProductSortKey = "recent" | "price-asc" | "price-desc" | "name";

// PostgREST's `.or()` takes a raw filter-expression string, where `,` `(` `)`
// are syntax, not data — escape them so a search term containing one can't
// corrupt or break the filter (it would otherwise either 400 or silently
// change what's matched).
function escapeOrValue(v: string): string {
  return v.replace(/[,()]/g, (c) => `\\${c}`);
}

export type PublicProductFilters = {
  q?: string | undefined;
  category?: string | undefined;
  brand?: string | undefined;
  size?: string | undefined;
  promo?: boolean | undefined;
  dispo?: boolean | undefined;
  sort?: ProductSortKey | undefined;
};

const PUBLIC_PAGE_SIZE = 24;

function buildPublicProductsQuery(filters: PublicProductFilters) {
  let query = supabase
    .from("products")
    .select(PUBLIC_PRODUCT_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  const q = filters.q?.trim();
  if (q) {
    const esc = escapeOrValue(q);
    query = query.or(`name.ilike.%${esc}%,brand.ilike.%${esc}%,sku.ilike.%${esc}%`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.brand) query = query.eq("brand", filters.brand);
  if (filters.size) query = query.contains("available_sizes", [filters.size]);
  if (filters.promo) query = query.eq("has_promo", true);
  if (filters.dispo) query = query.gt("stock", 0);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("effective_price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("effective_price", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  // Tie-break so rows have a fully deterministic order — without it, two
  // products sharing the same sort value could appear twice or never as the
  // user pages through (Postgres doesn't guarantee a stable order otherwise).
  return query.order("id", { ascending: true });
}

async function fetchPublicProductsPage(
  filters: PublicProductFilters,
  page: number,
): Promise<{ rows: Product[]; total: number }> {
  const from = page * PUBLIC_PAGE_SIZE;
  const { data, error, count } = await buildPublicProductsQuery(filters).range(
    from,
    from + PUBLIC_PAGE_SIZE - 1,
  );
  if (error) throw error;
  return { rows: ((data ?? []) as unknown as ProductRow[]).map(mapProduct), total: count ?? 0 };
}

// Shared between the boutique route's SSR loader (ensureInfiniteQueryData)
// and usePaginatedPublicProducts below, same reasoning as productsQueryOptions
// above (identical cache entry, no re-fetch after hydration).
export function publicProductsInfiniteQueryOptions(filters: PublicProductFilters) {
  return infiniteQueryOptions({
    queryKey: ["products", "public", "paginated", filters],
    queryFn: ({ pageParam }: { pageParam: number }) => fetchPublicProductsPage(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      return loaded < lastPage.total ? allPages.length : undefined;
    },
  });
}

/** Boutique: "Charger plus" accumulates pages, so this is an infinite query
 * (not a plain page-replace useQuery) — same UX as today's client-side
 * slice, now backed by real server pagination. */
export function usePaginatedPublicProducts(filters: PublicProductFilters) {
  return useInfiniteQuery(publicProductsInfiniteQueryOptions(filters));
}

// Options for the boutique's brand/size filter dropdowns — lightweight
// (two columns, active products only) compared to the full catalog fetch
// useProducts() used to do just to compute these two lists.
async function fetchProductFilterOptions(): Promise<{ brands: string[]; sizes: string[] }> {
  const { data, error } = await supabase
    .from("products")
    .select("brand, available_sizes")
    .eq("is_active", true);
  if (error) throw error;
  const brands = new Set<string>();
  const sizes = new Set<string>();
  for (const row of data ?? []) {
    brands.add(row.brand);
    for (const s of row.available_sizes ?? []) sizes.add(s);
  }
  return { brands: [...brands].sort(), sizes: [...sizes].sort() };
}

export const productFilterOptionsQueryOptions = queryOptions({
  queryKey: ["products", "public", "filter-options"],
  queryFn: fetchProductFilterOptions,
});

export function useProductFilterOptions() {
  return useQuery(productFilterOptionsQueryOptions);
}

export type AdminProductFilters = { q?: string | undefined; category?: string | undefined };

export const ADMIN_PRODUCTS_PAGE_SIZE = 20;
// Cap PostgREST accepts per request; the exhaustive fetch below loops this
// to cover any result-set size, never truncating silently.
const EXHAUSTIVE_BATCH_SIZE = 1000;

function buildAdminProductsQuery(filters: AdminProductFilters) {
  let query = supabase.from("products").select(ADMIN_PRODUCT_COLUMNS, { count: "exact" });
  const q = filters.q?.trim();
  if (q) {
    const esc = escapeOrValue(q);
    query = query.or(`name.ilike.%${esc}%,brand.ilike.%${esc}%,sku.ilike.%${esc}%`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  return query.order("created_at", { ascending: false }).order("id", { ascending: true });
}

async function fetchAdminProductsPage(
  filters: AdminProductFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: Product[]; total: number }> {
  const from = page * pageSize;
  const { data, error, count } = await buildAdminProductsQuery(filters).range(
    from,
    from + pageSize - 1,
  );
  if (error) throw error;
  return { rows: ((data ?? []) as unknown as ProductRow[]).map(mapProduct), total: count ?? 0 };
}

/** Admin Produits list: classic page-number pagination (Précédent/Suivant),
 * replacing the page on each navigation rather than accumulating. */
export function usePaginatedAdminProducts(filters: AdminProductFilters, page: number) {
  return useQuery({
    queryKey: ["products", "admin", "paginated", filters, page],
    queryFn: () => fetchAdminProductsPage(filters, page, ADMIN_PRODUCTS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

/** "Sélectionner tout le filtré" / export CSV: fetches every row matching
 * the current filters, not just the visible page — triggered explicitly by
 * the caller (never automatically), and exhaustive by construction (loops
 * in batches until a batch comes back short) rather than capped at an
 * arbitrary number, so it stays correct how ever large the result set grows. */
export async function fetchAllMatchingAdminProducts(
  filters: AdminProductFilters,
): Promise<Product[]> {
  const all: Product[] = [];
  let page = 0;

  while (true) {
    const { rows } = await fetchAdminProductsPage(filters, page, EXHAUSTIVE_BATCH_SIZE);
    all.push(...rows);
    if (rows.length < EXHAUSTIVE_BATCH_SIZE) break;
    page += 1;
  }
  return all;
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
