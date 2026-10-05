import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { useSettings } from "@/lib/api/settings";
import {
  useAdminPromoCodes,
  useCreatePromoCode,
  useUpdatePromoCode,
  useDeletePromoCode,
  useSetPromoCodeActive,
  type PromoCode,
  type PromoCodeInput,
} from "@/lib/api/promo-codes";

export const Route = createFileRoute("/nehub-53ff1f11/codes-promo")({
  component: AdminPromoCodes,
});

type FormState = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  minOrderTotal: string;
  maxUses: string;
  expiresAt: string;
};

const BLANK_FORM: FormState = {
  code: "",
  discountType: "percent",
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

/** ISO timestamp -> value a `datetime-local` input accepts, in the browser's
 * local time (matching how the admin reads/enters the date and time). */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function promoCodeToForm(p: PromoCode): FormState {
  return {
    code: p.code,
    discountType: p.discountType,
    discountValue: String(p.discountValue),
    minOrderTotal: p.minOrderTotal !== null ? String(p.minOrderTotal) : "",
    maxUses: p.maxUses !== null ? String(p.maxUses) : "",
    expiresAt: toDatetimeLocalValue(p.expiresAt),
  };
}

function validateForm(form: FormState): string | null {
  if (form.code.trim().length < 3) return "Le code doit contenir au moins 3 caractères.";
  const value = Number(form.discountValue);
  if (!Number.isFinite(value) || value <= 0 || (form.discountType === "percent" && value > 100)) {
    return "Valeur de réduction invalide.";
  }
  return null;
}

function formToInput(form: FormState, isActive: boolean): PromoCodeInput {
  return {
    code: form.code.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderTotal: form.minOrderTotal ? Number(form.minOrderTotal) : null,
    maxUses: form.maxUses ? Math.round(Number(form.maxUses)) : null,
    isActive,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

function PromoCodeFields({
  form,
  set,
  currency,
  idPrefix,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  currency: string;
  idPrefix: string;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-code`} className="mb-1 block text-sm font-medium">
          Code
        </label>
        <input
          id={`${idPrefix}-code`}
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
          placeholder="BIENVENUE10"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-discountType`} className="mb-1 block text-sm font-medium">
          Type
        </label>
        <select
          id={`${idPrefix}-discountType`}
          className="field"
          value={form.discountType}
          onChange={(e) => set("discountType", e.target.value as "percent" | "fixed")}
        >
          <option value="percent">Pourcentage (%)</option>
          <option value="fixed">Montant fixe ({currency})</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-discountValue`} className="mb-1 block text-sm font-medium">
          Valeur
        </label>
        <input
          id={`${idPrefix}-discountValue`}
          type="number"
          min={0}
          value={form.discountValue}
          onChange={(e) => set("discountValue", e.target.value)}
          placeholder={form.discountType === "percent" ? "10" : "1000"}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-minOrderTotal`} className="mb-1 block text-sm font-medium">
          Montant minimum (facultatif)
        </label>
        <input
          id={`${idPrefix}-minOrderTotal`}
          type="number"
          min={0}
          value={form.minOrderTotal}
          onChange={(e) => set("minOrderTotal", e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-maxUses`} className="mb-1 block text-sm font-medium">
          Utilisations max (facultatif)
        </label>
        <input
          id={`${idPrefix}-maxUses`}
          type="number"
          min={1}
          value={form.maxUses}
          onChange={(e) => set("maxUses", e.target.value)}
          placeholder="Illimité"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-expiresAt`} className="mb-1 block text-sm font-medium">
          Expiration — date et heure (facultatif)
        </label>
        <input
          id={`${idPrefix}-expiresAt`}
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
          className="field"
        />
      </div>
    </div>
  );
}

function AdminPromoCodes() {
  const { data: codes = [], isLoading } = useAdminPromoCodes();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const createCode = useCreatePromoCode();
  const updateCode = useUpdatePromoCode();
  const setActive = useSetPromoCodeActive();
  const deleteCode = useDeletePromoCode();
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [editForm, setEditForm] = useState<FormState>(BLANK_FORM);
  const [editError, setEditError] = useState("");
  const [toDelete, setToDelete] = useState<PromoCode | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setEdit<K extends keyof FormState>(key: K, value: FormState[K]) {
    setEditForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    createCode.mutate(formToInput(form, true), { onSuccess: () => setForm(BLANK_FORM) });
  }

  function startEdit(code: PromoCode) {
    setEditing(code);
    setEditForm(promoCodeToForm(code));
    setEditError("");
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const validationError = validateForm(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditError("");
    updateCode.mutate(
      { id: editing.id, input: formToInput(editForm, editing.isActive) },
      {
        onSuccess: () => setEditing(null),
        onError: (err) => setEditError(err instanceof Error ? err.message : "Erreur, réessayez."),
      },
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
        <PromoCodeFields form={form} set={set} currency={currency} idPrefix="new" />
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
          <table className="w-full min-w-[900px] text-sm">
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
                          onClick={() => startEdit(c)}
                        >
                          <Pencil size={14} />
                          Modifier
                        </button>
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
                          onClick={() => setToDelete(c)}
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

      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitEdit}
            className="w-full max-w-2xl border border-border bg-background p-5"
          >
            <h2 className="text-lg">Modifier {editing.code}</h2>
            <PromoCodeFields form={editForm} set={setEdit} currency={currency} idPrefix="edit" />
            {editError && <p className="mt-2 text-sm text-destructive">{editError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={() => setEditing(null)}
                disabled={updateCode.isPending}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-base btn-success"
                disabled={updateCode.isPending}
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-background p-5">
            <h2 className="text-lg">Supprimer {toDelete.code} ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Cette action est irréversible.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-base btn-outline"
                onClick={() => setToDelete(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-base btn-danger"
                onClick={() => {
                  deleteCode.mutate(toDelete.id);
                  setToDelete(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
