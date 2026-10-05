import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PromoCode = {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderTotal: number | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};

type PromoCodeRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_total: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

function mapPromoCode(row: PromoCodeRow): PromoCode {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type === "percent" ? "percent" : "fixed",
    discountValue: Number(row.discount_value),
    minOrderTotal: row.min_order_total !== null ? Number(row.min_order_total) : null,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export type PromoPreview =
  { valid: true; discount: number; code: string } | { valid: false; message: string };

/** Checks a code before checkout, without consuming it — the authoritative check happens again in create_order. */
export function usePreviewPromoCode() {
  return useMutation({
    mutationFn: async ({
      code,
      subtotal,
    }: {
      code: string;
      subtotal: number;
    }): Promise<PromoPreview> => {
      const { data, error } = await supabase.rpc("preview_promo_code", {
        p_code: code,
        p_subtotal: subtotal,
      });
      if (error) throw error;
      const result = data as { valid: boolean; discount?: number; code?: string; message?: string };
      if (result.valid) {
        return { valid: true, discount: Number(result.discount ?? 0), code: result.code ?? code };
      }
      return { valid: false, message: result.message ?? "Code promo invalide." };
    },
  });
}

export function useAdminPromoCodes() {
  return useQuery({
    queryKey: ["promo-codes"],
    queryFn: async (): Promise<PromoCode[]> => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPromoCode);
    },
  });
}

export type PromoCodeInput = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderTotal: number | null;
  maxUses: number | null;
  isActive: boolean;
  expiresAt: string | null;
};

export function useCreatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PromoCodeInput) => {
      const { error } = await supabase.from("promo_codes").insert({
        code: input.code.toUpperCase(),
        discount_type: input.discountType,
        discount_value: input.discountValue,
        min_order_total: input.minOrderTotal,
        max_uses: input.maxUses,
        is_active: input.isActive,
        expires_at: input.expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });
}

export function useUpdatePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PromoCodeInput }) => {
      const { error } = await supabase
        .from("promo_codes")
        .update({
          code: input.code.toUpperCase(),
          discount_type: input.discountType,
          discount_value: input.discountValue,
          min_order_total: input.minOrderTotal,
          max_uses: input.maxUses,
          expires_at: input.expiresAt,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });
}

export function useSetPromoCodeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });
}

export function useDeletePromoCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promo-codes"] }),
  });
}
