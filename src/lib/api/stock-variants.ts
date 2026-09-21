import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Adds a new size and/or color combination to a product, with its starting stock — audited in stock_movements. */
export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      size,
      colorId,
      initialStock,
    }: {
      productId: string;
      size: string | null;
      colorId: string | null;
      initialStock: number;
    }) => {
      const { error } = await supabase.rpc("add_product_variant", {
        p_product_id: productId,
        p_size: size,
        p_color_id: colorId,
        p_initial_stock: initialStock,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

/** Removes a size entirely — audited in stock_movements. */
export function useRemoveVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase.rpc("remove_product_variant", { p_variant_id: variantId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

/** Adjusts one size's stock — the per-variant equivalent of adjust_stock. */
export function useAdjustVariantStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      newStock,
      reason,
    }: {
      variantId: string;
      newStock: number;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("adjust_variant_stock", {
        p_variant_id: variantId,
        p_new_stock: newStock,
        p_reason: reason ?? "Ajustement manuel",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

/** Adds a new color to a product, with its own photo set — colors have no stock of their own (their variants do). */
export function useAddColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      name,
      hexColor,
      images,
      sortOrder,
    }: {
      productId: string;
      name: string;
      hexColor: string | null;
      images: string[];
      sortOrder?: number;
    }) => {
      const { error } = await supabase.rpc("add_product_color", {
        p_product_id: productId,
        p_name: name,
        p_hex_color: hexColor,
        p_images: images,
        p_sort_order: sortOrder ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
    },
  });
}

/** Renames a color and/or replaces its photo set. */
export function useUpdateColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      colorId,
      name,
      hexColor,
      images,
    }: {
      colorId: string;
      name: string;
      hexColor: string | null;
      images: string[];
    }) => {
      const { error } = await supabase.rpc("update_product_color", {
        p_color_id: colorId,
        p_name: name,
        p_hex_color: hexColor,
        p_images: images,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

/** Removes a color entirely — its variants (and their stock) go with it, audited in stock_movements. */
export function useRemoveColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await supabase.rpc("remove_product_color", { p_color_id: colorId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
