import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/lib/api/settings";
import { Skeleton } from "@/components/Skeleton";
import { toast } from "@/lib/toast";
import type { StoreSettings } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/parametres")({
  component: AdminSettings,
});

const FIELDS: Array<{ key: keyof StoreSettings; label: string; type?: string; hint?: string }> = [
  { key: "storeName", label: "Nom de la boutique" },
  {
    key: "whatsappNumber",
    label: "Numéro WhatsApp",
    hint: "Avec indicatif pays, sans espaces ni +. Ex: 24106056366",
  },
  { key: "currency", label: "Devise" },
  { key: "email", label: "Email de contact", type: "email" },
  { key: "phone", label: "Téléphone affiché" },
  { key: "address", label: "Adresse" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
];

function AdminSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Partial<StoreSettings>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading || !settings) {
    return (
      <div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-96" />
        <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[42px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync(form);
    toast("Paramètres enregistrés.");
  }

  return (
    <div>
      <h1 className="text-2xl">Paramètres de la boutique</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Le numéro WhatsApp configuré ici est utilisé partout sur le site (facture, boutons de
        paiement).
      </p>

      <form onSubmit={submit} className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className={f.key === "storeName" || f.key === "address" ? "sm:col-span-2" : ""}
          >
            <label htmlFor={f.key} className="mb-1 block text-sm font-medium">
              {f.label}
            </label>
            <input
              id={f.key}
              type={f.type ?? "text"}
              className="field"
              value={(form[f.key] as string) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
            {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        ))}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="btn-base btn-success"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
