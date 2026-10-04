import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileDown } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { PeriodPicker } from "@/components/PeriodPicker";
import { periodRange, parseDateOnly, PERIODS, type PeriodKey } from "@/lib/period";
import { Spinner } from "@/components/Spinner";
import {
  PAID_STATUSES,
  itemProfit,
  itemRevenue,
  computeCategoryRows,
  computeCategoryStockRows,
  mergeCategoryFinancials,
} from "@/lib/accounting";
import { useAdminOrders } from "@/lib/api/orders";
import { useAdminProducts } from "@/lib/api/products";
import { useAdminExpenses } from "@/lib/api/expenses";
import { useSettings } from "@/lib/api/settings";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/nehub-53ff1f11/comptabilite")({
  component: Accounting,
});

type ProductRow = {
  key: string;
  name: string;
  brand: string;
  revenue: number;
  profit: number;
  units: number;
  margin: number;
};

type PromoRow = {
  code: string;
  orders: number;
  revenue: number;
  discount: number;
  profit: number;
  margin: number;
  avgOrderValue: number;
};

function Accounting() {
  const { data: orders = [], isLoading: ordersLoading } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: expenses = [] } = useAdminExpenses();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";

  const [periodKey, setPeriodKey] = useState<PeriodKey>("30j");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const categoryByProductId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.id, p.category);
    return map;
  }, [products]);

  const { start, end } = useMemo(() => periodRange(periodKey, from, to), [periodKey, from, to]);

  const ordersInRange = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      }),
    [orders, start, end],
  );

  const paidOrders = useMemo(
    () => ordersInRange.filter((o) => PAID_STATUSES.includes(o.status)),
    [ordersInRange],
  );
  const cancelledOrders = useMemo(
    () => ordersInRange.filter((o) => o.status === "Annulée"),
    [ordersInRange],
  );
  const pendingOrders = useMemo(
    () => ordersInRange.filter((o) => !PAID_STATUSES.includes(o.status) && o.status !== "Annulée"),
    [ordersInRange],
  );

  const revenue = paidOrders.reduce((n, o) => n + o.total, 0);
  const discountGiven = paidOrders.reduce((n, o) => n + o.discount, 0);
  const cogs = paidOrders.reduce(
    (n, o) => n + o.items.reduce((s, it) => s + it.costPrice * it.quantity, 0),
    0,
  );
  const profit = revenue - cogs;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const units = paidOrders.reduce((n, o) => n + o.items.reduce((s, it) => s + it.quantity, 0), 0);
  const avgOrderValue = paidOrders.length > 0 ? revenue / paidOrders.length : 0;
  const pendingValue = pendingOrders.reduce((n, o) => n + o.total, 0);
  const cancelledValue = cancelledOrders.reduce((n, o) => n + o.total, 0);

  const expensesInRange = useMemo(
    () =>
      expenses.filter((e) => {
        const d = parseDateOnly(e.expenseDate);
        return d >= start && d <= end;
      }),
    [expenses, start, end],
  );
  const expensesTotal = expensesInRange.reduce((n, e) => n + e.amount, 0);
  const netResult = profit - expensesTotal;
  const netMargin = revenue > 0 ? Math.round((netResult / revenue) * 100) : 0;

  const kpis: { label: string; value: string; className?: string }[] = [
    { label: "Chiffre d'affaires encaissé", value: formatPrice(revenue, currency) },
    {
      label: "Bénéfice brut",
      value: formatPrice(profit, currency),
      className: profit >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Marge nette",
      value: `${margin}%`,
      className: margin >= 0 ? "text-success" : "text-destructive",
    },
    { label: "Coût des marchandises vendues", value: formatPrice(cogs, currency) },
    { label: "Charges (hors marchandises)", value: formatPrice(expensesTotal, currency) },
    {
      label: "Résultat net",
      value: `${formatPrice(netResult, currency)} (${netMargin}%)`,
      className: netResult >= 0 ? "text-success" : "text-destructive",
    },
    { label: "Commandes payées", value: String(paidOrders.length) },
    { label: "Panier moyen", value: formatPrice(avgOrderValue, currency) },
    { label: "Unités vendues", value: String(units) },
    { label: "Remises accordées", value: formatPrice(discountGiven, currency) },
    { label: "En attente de paiement", value: formatPrice(pendingValue, currency) },
    {
      label: "Commandes annulées",
      value: `${cancelledOrders.length} · ${formatPrice(cancelledValue, currency)}`,
    },
  ];

  const categoryRows = useMemo(
    () => computeCategoryRows(paidOrders, categoryByProductId),
    [paidOrders, categoryByProductId],
  );

  const categoryStockRows = useMemo(() => computeCategoryStockRows(products), [products]);

  const categoryFinancials = useMemo(
    () => mergeCategoryFinancials(categoryRows, categoryStockRows),
    [categoryRows, categoryStockRows],
  );

  const categoryMaxRevenue = Math.max(1, ...categoryFinancials.map((r) => r.revenue));

  const productRows: ProductRow[] = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const o of paidOrders) {
      for (const it of o.items) {
        const key = it.productId ?? `${it.sku}-${it.name}`;
        const row = map.get(key) ?? {
          key,
          name: it.name,
          brand: it.brand,
          revenue: 0,
          profit: 0,
          units: 0,
          margin: 0,
        };
        row.revenue += itemRevenue(it);
        row.profit += itemProfit(it);
        row.units += it.quantity;
        map.set(key, row);
      }
    }
    return [...map.values()].map((r) => ({
      ...r,
      margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 100) : 0,
    }));
  }, [paidOrders]);

  const topProfit = [...productRows].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const worstProfit = [...productRows]
    .filter((r) => r.units > 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);

  const promoRows: PromoRow[] = useMemo(() => {
    const map = new Map<string, PromoRow>();
    for (const o of paidOrders) {
      if (!o.promoCode) continue;
      const row = map.get(o.promoCode) ?? {
        code: o.promoCode,
        orders: 0,
        revenue: 0,
        discount: 0,
        profit: 0,
        margin: 0,
        avgOrderValue: 0,
      };
      const orderCogs = o.items.reduce((s, it) => s + it.costPrice * it.quantity, 0);
      row.orders += 1;
      row.revenue += o.total;
      row.discount += o.discount;
      row.profit += o.total - orderCogs;
      map.set(o.promoCode, row);
    }
    return [...map.values()]
      .map((r) => ({
        ...r,
        margin: r.revenue > 0 ? Math.round((r.profit / r.revenue) * 100) : 0,
        avgOrderValue: r.orders > 0 ? r.revenue / r.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  const trend = useMemo(() => buildTrend(paidOrders, start, end), [paidOrders, start, end]);
  const trendMax = Math.max(1, ...trend.map((t) => Math.max(t.revenue, 0)));

  function exportCategoryCsv() {
    downloadCsv(
      `compta-categories-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Catégorie",
        "CA",
        "CMV",
        "Bénéfice",
        "Marge %",
        "Unités vendues",
        "Valeur stock (achat)",
        "Bénéfice potentiel (stock)",
        "Unités en stock",
      ],
      categoryFinancials.map((r) => [
        r.name,
        r.revenue,
        r.cogs,
        r.profit,
        r.margin,
        r.units,
        r.stockValue,
        r.potentialProfit,
        r.stockUnits,
      ]),
    );
  }

  function exportTrendCsv() {
    downloadCsv(
      `compta-tendance-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Période", "CA", "Bénéfice", "Commandes"],
      trend.map((t) => [t.label, t.revenue, t.profit, t.orders]),
    );
  }

  function exportPromoCsv() {
    downloadCsv(
      `compta-codes-promo-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Code", "Commandes", "CA", "Remises accordées", "Bénéfice", "Marge %", "Panier moyen"],
      promoRows.map((r) => [
        r.code,
        r.orders,
        r.revenue,
        r.discount,
        r.profit,
        r.margin,
        Math.round(r.avgOrderValue),
      ]),
    );
  }

  async function exportPdf() {
    setExportingPdf(true);
    try {
      const [{ default: JsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new JsPDF();
      const periodLabel = PERIODS.find((p) => p.key === periodKey)?.label ?? "";
      const rangeLabel = `${start.toLocaleDateString("fr-FR")} — ${end.toLocaleDateString("fr-FR")}`;

      doc.setFontSize(16);
      doc.text(settings?.storeName ?? "New Era Hub 241", 14, 18);
      doc.setFontSize(11);
      doc.text("Rapport comptable", 14, 26);
      doc.setFontSize(9);
      doc.text(`Période : ${periodLabel} (${rangeLabel})`, 14, 32);

      autoTable(doc, {
        startY: 38,
        head: [["Indicateur", "Valeur"]],
        body: kpis.map((k) => [k.label, k.value]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [23, 23, 23] },
      });

      let cursorY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      if (categoryFinancials.length > 0) {
        doc.setFontSize(11);
        doc.text("Marges et stock par catégorie", 14, cursorY);
        autoTable(doc, {
          startY: cursorY + 4,
          head: [["Catégorie", "CA", "Bénéfice", "Marge", "Valeur stock", "Bénéfice potentiel"]],
          body: categoryFinancials.map((r) => [
            r.name,
            formatPrice(r.revenue, currency),
            formatPrice(r.profit, currency),
            `${r.margin}%`,
            formatPrice(r.stockValue, currency),
            formatPrice(r.potentialProfit, currency),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [23, 23, 23] },
        });
        cursorY =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      if (promoRows.length > 0) {
        doc.setFontSize(11);
        doc.text("Rentabilité des codes promo", 14, cursorY);
        autoTable(doc, {
          startY: cursorY + 4,
          head: [["Code", "Commandes", "CA", "Remises", "Bénéfice", "Marge"]],
          body: promoRows.map((r) => [
            r.code,
            String(r.orders),
            formatPrice(r.revenue, currency),
            formatPrice(r.discount, currency),
            formatPrice(r.profit, currency),
            `${r.margin}%`,
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [23, 23, 23] },
        });
      }

      doc.save(`rapport-comptable-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  const isLoading = ordersLoading;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Comptabilité</h1>
        <button
          type="button"
          onClick={() => void exportPdf()}
          disabled={exportingPdf || isLoading}
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
        >
          {exportingPdf ? <Spinner size={14} /> : <FileDown size={14} />}
          Exporter PDF (mensuel)
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-border py-3">
        <PeriodPicker
          value={periodKey}
          onChange={setPeriodKey}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
        <span className="text-xs text-muted-foreground">
          {ordersInRange.length} commande(s) sur la période, dont {paidOrders.length} payée(s)
        </span>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="border border-border p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </div>
                <div className={`mt-1 text-xl font-bold ${k.className ?? ""}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <section className="mt-8 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="text-base">Chiffre d'affaires par période</h2>
              <button
                type="button"
                onClick={exportTrendCsv}
                className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
            {trend.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucune donnée sur la période.</p>
            ) : (
              <ul className="divide-y divide-border">
                {trend.map((t) => (
                  <li key={t.label} className="flex items-center gap-3 p-3 text-sm">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                    <div className="h-5 flex-1 bg-muted">
                      <div
                        className="h-5 bg-foreground"
                        style={{ width: `${Math.max(2, (t.revenue / trendMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right font-medium">
                      {formatPrice(t.revenue, currency)}
                    </span>
                    <span
                      className={`w-24 shrink-0 text-right text-xs ${t.profit >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {formatPrice(t.profit, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="text-base">Marges et stock par catégorie</h2>
              <button
                type="button"
                onClick={exportCategoryCsv}
                className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
            {categoryFinancials.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucune vente ni stock sur la période.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Part du CA</th>
                      <th className="p-3 text-right">CA</th>
                      <th className="p-3 text-right">CMV</th>
                      <th className="p-3 text-right">Bénéfice</th>
                      <th className="p-3 text-right">Marge</th>
                      <th className="p-3 text-right">Unités vendues</th>
                      <th className="p-3 text-right">Valeur stock</th>
                      <th className="p-3 text-right">Bénéfice potentiel (stock)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryFinancials.map((r) => (
                      <tr key={r.name} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3">
                          <div className="h-2 w-28 bg-muted">
                            <div
                              className="h-2 bg-foreground"
                              style={{
                                width: `${Math.max(2, (r.revenue / categoryMaxRevenue) * 100)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right">{formatPrice(r.revenue, currency)}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {formatPrice(r.cogs, currency)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${r.profit >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {formatPrice(r.profit, currency)}
                        </td>
                        <td
                          className={`p-3 text-right ${r.margin >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {r.margin}%
                        </td>
                        <td className="p-3 text-right">{r.units}</td>
                        <td className="p-3 text-right">
                          {formatPrice(r.stockValue, currency)}
                          <div className="text-xs text-muted-foreground">
                            {r.stockUnits} unité(s)
                          </div>
                        </td>
                        <td
                          className={`p-3 text-right ${r.potentialProfit >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {formatPrice(r.potentialProfit, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-border p-3 text-xs text-muted-foreground">
              CA/CMV/bénéfice par catégorie calculés au prix unitaire brut sur la période
              sélectionnée (hors répartition des codes promo) — le CA encaissé ci-dessus (après
              remises) fait foi pour le total. La valeur du stock et le bénéfice potentiel sont un
              instantané de l'inventaire actuel (prix d'achat), indépendant de la période.
            </p>
          </section>

          <section className="mt-6 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="text-base">Rentabilité des codes promo</h2>
              {promoRows.length > 0 && (
                <button
                  type="button"
                  onClick={exportPromoCsv}
                  className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
                >
                  <Download size={14} />
                  Exporter CSV
                </button>
              )}
            </div>
            {promoRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucun code promo utilisé sur la période.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                      <th className="p-3">Code</th>
                      <th className="p-3 text-right">Commandes</th>
                      <th className="p-3 text-right">CA généré</th>
                      <th className="p-3 text-right">Remises accordées</th>
                      <th className="p-3 text-right">Bénéfice</th>
                      <th className="p-3 text-right">Marge</th>
                      <th className="p-3 text-right">Panier moyen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoRows.map((r) => (
                      <tr key={r.code} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{r.code}</td>
                        <td className="p-3 text-right">{r.orders}</td>
                        <td className="p-3 text-right">{formatPrice(r.revenue, currency)}</td>
                        <td className="p-3 text-right text-destructive">
                          -{formatPrice(r.discount, currency)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${r.profit >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {formatPrice(r.profit, currency)}
                        </td>
                        <td
                          className={`p-3 text-right ${r.margin >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {r.margin}%
                        </td>
                        <td className="p-3 text-right">{formatPrice(r.avgOrderValue, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="border border-border">
              <h2 className="border-b border-border p-4 text-base">Top 5 bénéfices</h2>
              {topProfit.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Aucune vente sur la période.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {topProfit.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {r.brand} {r.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.units} vendu(s) · marge {r.margin}%
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold text-success">
                        {formatPrice(r.profit, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-border">
              <h2 className="border-b border-border p-4 text-base">
                À surveiller (plus faible marge)
              </h2>
              {worstProfit.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Aucune vente sur la période.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {worstProfit.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3 p-4 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {r.brand} {r.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.units} vendu(s)</div>
                      </div>
                      <span
                        className={`shrink-0 font-semibold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatPrice(r.profit, currency)} · {r.margin}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Besoin du détail commande par commande ?{" "}
            <Link to="/nehub-53ff1f11/commandes" className="underline hover:text-foreground">
              Voir les commandes
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

type TrendPoint = { label: string; revenue: number; profit: number; orders: number };

/** Buckets paid orders by day if the range is short, otherwise by month — keeps the chart readable either way. */
function buildTrend(paidOrders: Order[], start: Date, end: Date): TrendPoint[] {
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const byMonth = spanDays > 62;

  const buckets = new Map<string, TrendPoint>();
  for (const o of paidOrders) {
    const d = new Date(o.createdAt);
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = byMonth
      ? d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    const point = buckets.get(key) ?? { label, revenue: 0, profit: 0, orders: 0 };
    point.revenue += o.total;
    point.profit += o.items.reduce((s, it) => s + itemProfit(it), 0);
    point.orders += 1;
    buckets.set(key, point);
  }
  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}
