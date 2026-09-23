import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, Download } from "lucide-react";
import { formatDateOnly, formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { PeriodPicker } from "@/components/PeriodPicker";
import { periodRange, parseDateOnly, type PeriodKey } from "@/lib/period";
import { useSettings } from "@/lib/api/settings";
import { useAdminExpenses, useCreateExpense, useDeleteExpense } from "@/lib/api/expenses";

export const Route = createFileRoute("/nehub-53ff1f11/depenses")({
  component: AdminExpenses,
});

const CATEGORIES = ["Loyer", "Publicité", "Livraison", "Salaires", "Fournitures", "Autre"] as const;

const BLANK_FORM = {
  category: "Loyer" as string,
  label: "",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  note: "",
};

function AdminExpenses() {
  const { data: expenses = [], isLoading } = useAdminExpenses();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [form, setForm] = useState(BLANK_FORM);
  const [error, setError] = useState("");
  const [periodKey, setPeriodKey] = useState<PeriodKey>("mois");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { start, end } = useMemo(() => periodRange(periodKey, from, to), [periodKey, from, to]);

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        const d = parseDateOnly(e.expenseDate);
        return d >= start && d <= end;
      }),
    [expenses, start, end],
  );
  const total = filtered.reduce((n, e) => n + e.amount, 0);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.label.trim()) {
      setError("Le libellé est requis.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Montant invalide.");
      return;
    }
    setError("");
    createExpense.mutate(
      {
        category: form.category,
        label: form.label,
        amount,
        expenseDate: form.expenseDate,
        note: form.note,
      },
      { onSuccess: () => setForm({ ...BLANK_FORM, category: form.category }) },
    );
  }

  function exportCsv() {
    downloadCsv(
      `depenses-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Catégorie", "Libellé", "Montant", "Note"],
      filtered.map((e) => [e.expenseDate, e.category, e.label, e.amount, e.note]),
    );
  }

  return (
    <div>
      <h1 className="text-2xl">Dépenses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Charges hors marchandises (loyer, publicité, livraison, salaires...) — utilisées pour
        calculer le résultat net sur la page Comptabilité.
      </p>

      <form onSubmit={submit} className="mt-6 max-w-2xl border border-border p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Nouvelle dépense</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium">
              Catégorie
            </label>
            <select
              id="category"
              className="field"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="label" className="mb-1 block text-sm font-medium">
              Libellé
            </label>
            <input
              id="label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Loyer boutique - septembre"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="amount" className="mb-1 block text-sm font-medium">
              Montant ({currency})
            </label>
            <input
              id="amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="expenseDate" className="mb-1 block text-sm font-medium">
              Date
            </label>
            <input
              id="expenseDate"
              type="date"
              value={form.expenseDate}
              onChange={(e) => set("expenseDate", e.target.value)}
              className="field"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="note" className="mb-1 block text-sm font-medium">
              Note (facultatif)
            </label>
            <input
              id="note"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className="field"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={createExpense.isPending}
          className="btn-base btn-success mt-4"
        >
          Ajouter la dépense
        </button>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker
            value={periodKey}
            onChange={setPeriodKey}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <span className="text-sm text-muted-foreground">
            Total :{" "}
            <span className="font-semibold text-foreground">{formatPrice(total, currency)}</span>
          </span>
        </div>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucune dépense sur la période.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Libellé</th>
                <th className="p-3 text-right">Montant</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="p-3 text-xs text-muted-foreground">
                    {formatDateOnly(e.expenseDate)}
                  </td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">
                    {e.label}
                    {e.note && <div className="text-xs text-muted-foreground">{e.note}</div>}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {formatPrice(e.amount, currency)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                      onClick={() => deleteExpense.mutate(e.id)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
