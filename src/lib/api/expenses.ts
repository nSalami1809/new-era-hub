import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ExpenseUpdateRow = Database["public"]["Tables"]["expenses"]["Update"];

export type Expense = {
  id: string;
  category: string;
  label: string;
  amount: number;
  expenseDate: string;
  note: string;
  createdAt: string;
};

type ExpenseRow = {
  id: string;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  note: string;
  created_at: string;
};

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    category: row.category,
    label: row.label,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function useAdminExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapExpense);
    },
  });
}

export type ExpenseInput = {
  category: string;
  label: string;
  amount: number;
  expenseDate: string;
  note: string;
};

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const { error } = await supabase.from("expenses").insert({
        category: input.category.trim(),
        label: input.label.trim(),
        amount: input.amount,
        expense_date: input.expenseDate,
        note: input.note.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ExpenseInput> }) => {
      const row: ExpenseUpdateRow = {};
      if (patch.category !== undefined) row.category = patch.category.trim();
      if (patch.label !== undefined) row.label = patch.label.trim();
      if (patch.amount !== undefined) row.amount = patch.amount;
      if (patch.expenseDate !== undefined) row.expense_date = patch.expenseDate;
      if (patch.note !== undefined) row.note = patch.note.trim();
      const { error } = await supabase.from("expenses").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
