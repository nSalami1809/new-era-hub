import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Adds a new size to a product, with its starting stock — audited in stock_movements. */
export function useAddVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      size,
      initialStock,
    }: {
      productId: string;
      size: string;
      initialStock: number;
    }) => {
      const { error } = await supabase.rpc("add_product_variant", {
        p_product_id: productId,
        p_size: size,
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
