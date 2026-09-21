import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { StoreSettings } from "@/lib/types";

type SettingsRow = Database["public"]["Tables"]["store_settings"]["Row"];
type SettingsUpdateRow = Database["public"]["Tables"]["store_settings"]["Update"];

function mapSettings(row: SettingsRow): StoreSettings {
  return {
    storeName: row.store_name,
    logoText: row.logo_text,
    logoUrl: row.logo_url,
    whatsappNumber: row.whatsapp_number,
    currency: row.currency,
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    instagram: row.instagram ?? "",
    facebook: row.facebook ?? "",
  };
}

function toRow(patch: Partial<StoreSettings>): SettingsUpdateRow {
  const row: SettingsUpdateRow = {};
  if (patch.storeName !== undefined) row.store_name = patch.storeName;
  if (patch.logoText !== undefined) row.logo_text = patch.logoText;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.whatsappNumber !== undefined) row.whatsapp_number = patch.whatsappNumber;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.instagram !== undefined) row.instagram = patch.instagram;
  if (patch.facebook !== undefined) row.facebook = patch.facebook;
  return row;
}

async function fetchSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return mapSettings(data);
}

// Shared with route loaders — see the productsQueryOptions comment in
// lib/api/products.ts for why.
export const settingsQueryOptions = queryOptions({
  queryKey: ["settings"],
  queryFn: fetchSettings,
});

export function useSettings() {
  return useQuery(settingsQueryOptions);
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<StoreSettings>) => {
      const { error } = await supabase.from("store_settings").update(toRow(patch)).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
