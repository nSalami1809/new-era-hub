import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StockAlert = {
  id: string;
  productId: string;
  phone: string;
  createdAt: string;
};

function mapStockAlert(row: {
  id: string;
  product_id: string;
  phone: string;
  created_at: string;
}): StockAlert {
  return { id: row.id, productId: row.product_id, phone: row.phone, createdAt: row.created_at };
}

export function useStockAlerts() {
  return useQuery({
    queryKey: ["stock-alerts"],
    queryFn: async (): Promise<StockAlert[]> => {
      const { data, error } = await supabase
        .from("stock_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapStockAlert);
    },
  });
}

export function useCreateStockAlert() {
  return useMutation({
    mutationFn: async ({ productId, phone }: { productId: string; phone: string }) => {
      const { error } = await supabase
        .from("stock_alerts")
        .insert({ product_id: productId, phone });
      if (error) throw error;
    },
  });
}

export function useDeleteStockAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock-alerts"] }),
  });
}
