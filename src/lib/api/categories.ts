import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SizeType } from "@/lib/types";

export type ProductCategoryRow = {
  id: string;
  name: string;
  sizeType: SizeType;
  createdAt: string;
};

async function fetchCategories(): Promise<ProductCategoryRow[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sizeType: (row.size_type as SizeType) ?? "none",
    createdAt: row.created_at,
  }));
}

// Shared with route loaders — see the productsQueryOptions comment in
// lib/api/products.ts for why.
export const categoriesQueryOptions = queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
});

export function useCategories() {
  return useQuery(categoriesQueryOptions);
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, sizeType }: { name: string; sizeType: SizeType }) => {
      const { error } = await supabase
        .from("product_categories")
        .insert({ name: name.trim(), size_type: sizeType });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** Changes what kind of size a category's products use (e.g. reclassify "Sacs" from none to clothing). */
export function useSetCategorySizeType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, sizeType }: { categoryId: string; sizeType: SizeType }) => {
      const { error } = await supabase.rpc("set_category_size_type", {
        p_category_id: categoryId,
        p_size_type: sizeType,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** Fails with a friendly message if the category is still used by products (FK restrict). */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "Cette catégorie est utilisée par des produits : impossible de la supprimer.",
          );
        }
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
