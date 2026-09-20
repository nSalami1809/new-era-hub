import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StockMovement } from "@/lib/types";

type StockMovementRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  previous_stock: number;
  new_stock: number;
  difference: number;
  reason: string;
  admin_id: string | null;
  created_at: string;
};

function mapMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    previousStock: row.previous_stock,
    newStock: row.new_stock,
    difference: row.difference,
    reason: row.reason,
    createdAt: row.created_at,
    adminId: row.admin_id,
  };
}

async function fetchStockMovements(): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapMovement);
}

export function useStockMovements() {
  return useQuery({ queryKey: ["stock-movements"], queryFn: fetchStockMovements });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      newStock,
      reason,
    }: {
      productId: string;
      newStock: number;
      reason: string;
    }) => {
      const { error } = await supabase.rpc("adjust_stock", {
        p_product_id: productId,
        p_new_stock: newStock,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
