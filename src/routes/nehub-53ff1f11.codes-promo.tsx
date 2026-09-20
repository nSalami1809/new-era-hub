import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { useSettings } from "@/lib/api/settings";
import {
  useAdminPromoCodes,
  useCreatePromoCode,
  useDeletePromoCode,
  useSetPromoCodeActive,
  type PromoCode,
} from "@/lib/api/promo-codes";

export const Route = createFileRoute("/nehub-53ff1f11/codes-promo")({
  component: AdminPromoCodes,
});

const BLANK_FORM = {
  code: "",
  discountType: "percent" as "percent" | "fixed",
  discountValue: "",
  minOrderTotal: "",
  maxUses: "",
  expiresAt: "",
};

function isExpired(p: PromoCode) {
  return p.expiresAt !== null && new Date(p.expiresAt) < new Date();
}

function isExhausted(p: PromoCode) {
  return p.maxUses !== null && p.usedCount >= p.maxUses;
}

function AdminPromoCodes() {
  const { data: codes = [], isLoading } = useAdminPromoCodes();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const createCode = useCreatePromoCode();
  const setActive = useSetPromoCodeActive();
  const deleteCode = useDeletePromoCode();
  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = form.code.trim();
    const value = Number(form.discountValue);
    if (code.length < 3) {
      setError("Le code doit contenir au moins 3 caractères.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0 || (form.discountType === "percent" && value > 100)) {
      setError("Valeur de réduction invalide.");
      return;
    }
    setError("");
    createCode.mutate(
      {
        code,
        discountType: form.discountType,
        discountValue: value,
        minOrderTotal: form.minOrderTotal ? Number(form.minOrderTotal) : null,
        maxUses: form.maxUses ? Math.round(Number(form.maxUses)) : null,
        isActive: true,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      },
      { onSuccess: () => setForm(BLANK_FORM) },
    );
  }

  return (
    <div>
      <h1 className="text-2xl">Codes promo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Coupons de réduction saisis par les clients au moment de la commande.
      </p>

      <form onSubmit={submit} className="mt-6 max-w-2xl border border-border p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Nouveau code</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Code
            </label>
            <input
              id="code"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="BIENVENUE10"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="discountType" className="mb-1 block text-sm font-medium">
              Type
            </label>
            <select
              id="discountType"
              className="field"
              value={form.discountType}
              onChange={(e) => set("discountType", e.target.value as "percent" | "fixed")}
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe ({currency})</option>
            </select>
          </div>
          <div>
            <label htmlFor="discountValue" className="mb-1 block text-sm font-medium">
              Valeur
            </label>
            <input
              id="discountValue"
              type="number"
              min={0}
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              placeholder={form.discountType === "percent" ? "10" : "1000"}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="minOrderTotal" className="mb-1 block text-sm font-medium">
              Montant minimum (facultatif)
            </label>
            <input
              id="minOrderTotal"
              type="number"
              min={0}
              value={form.minOrderTotal}
              onChange={(e) => set("minOrderTotal", e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="maxUses" className="mb-1 block text-sm font-medium">
              Utilisations max (facultatif)
            </label>
            <input
              id="maxUses"
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => set("maxUses", e.target.value)}
              placeholder="Illimité"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="expiresAt" className="mb-1 block text-sm font-medium">
              Expiration (facultatif)
            </label>
            <input
              id="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
              className="field"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={createCode.isPending} className="btn-base btn-success mt-4">
          Créer le code
        </button>
      </form>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : codes.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucun code promo pour le moment.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-border">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Code</th>
                <th className="p-3">Réduction</th>
                <th className="p-3">Minimum</th>
                <th className="p-3">Utilisations</th>
                <th className="p-3">Expiration</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const expired = isExpired(c);
                const exhausted = isExhausted(c);
                const effective = c.isActive && !expired && !exhausted;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{c.code}</td>
                    <td className="p-3">
                      {c.discountType === "percent"
                        ? `${c.discountValue}%`
                        : formatPrice(c.discountValue, currency)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.minOrderTotal !== null ? formatPrice(c.minOrderTotal, currency) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.usedCount}
                      {c.maxUses !== null ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.expiresAt ? formatDate(c.expiresAt) : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          effective
                            ? "text-success"
                            : expired || exhausted
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {!c.isActive
                          ? "Désactivé"
                          : expired
                            ? "Expiré"
                            : exhausted
                              ? "Épuisé"
                              : "Actif"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                          onClick={() => setActive.mutate({ id: c.id, isActive: !c.isActive })}
                        >
                          {c.isActive ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          type="button"
                          className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                          onClick={() => deleteCode.mutate(c.id)}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
