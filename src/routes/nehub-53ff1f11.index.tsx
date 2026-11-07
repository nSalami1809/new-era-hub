import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Clock,
  Package,
  PackageCheck,
  Percent,
  ShoppingCart,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { TrendAreaChart } from "@/components/TrendAreaChart";
import { PeriodPicker } from "@/components/PeriodPicker";
import { formatDate, formatPrice } from "@/lib/format";
import { PAID_STATUSES, buildTrend } from "@/lib/accounting";
import { periodRange, type PeriodKey } from "@/lib/period";
import { useAdminProducts } from "@/lib/api/products";
import { useAdminOrders } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { effectivePrice, stockStatus, type Order } from "@/lib/types";

/** Rounded +/-% badge comparing a period's total to the immediately
 * preceding period of equal length — null (hidden) when there's no prior
 * period to compare against, rather than a misleading "+∞%". */
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-semibold ${
        positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      {positive ? "+" : ""}
      {pct}%
    </span>
  );
}

function sumRevenue(paidOrders: Order[], start: Date, end: Date): number {
  return paidOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    })
    .reduce((n, o) => n + o.total, 0);
}

export const Route = createFileRoute("/nehub-53ff1f11/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: products = [] } = useAdminProducts();
  const { data: orders = [] } = useAdminOrders();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";

  const [periodKey, setPeriodKey] = useState<PeriodKey>("7j");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inStock = products.filter((p) => p.stock > 0).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const promos = products.filter((p) => p.promotionalPrice && p.promotionalPrice < p.price).length;
  const paidOrders = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const revenue = paidOrders.reduce((n, o) => n + o.total, 0);
  const cogs = paidOrders.reduce(
    (n, o) => n + o.items.reduce((s, it) => s + it.costPrice * it.quantity, 0),
    0,
  );
  const profit = revenue - cogs;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const stockValue = products.reduce((n, p) => n + p.stock * p.costPrice, 0);
  const potentialProfit = products.reduce(
    (n, p) => n + p.stock * (effectivePrice(p) - p.costPrice),
    0,
  );
  const pending = orders.filter((o) => o.status === "Nouvelle").length;
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);
  const bestSellersMax = Math.max(1, ...bestSellers.map((p) => p.sold));

  const healthyStock = products.filter((p) => stockStatus(p) === "in").length;
  const lowStock = products.filter((p) => stockStatus(p) === "low").length;

  const { start: periodStart, end: periodEnd } = periodRange(periodKey, from, to);
  const periodRevenue = sumRevenue(paidOrders, periodStart, periodEnd);
  const previousEnd = new Date(periodStart.getTime() - 1);
  const previousStart = new Date(
    previousEnd.getTime() - (periodEnd.getTime() - periodStart.getTime()),
  );
  const previousRevenue = sumRevenue(paidOrders, previousStart, previousEnd);
  const trend = buildTrend(paidOrders, periodStart, periodEnd);

  return (
    <div>
      <h1 className="text-2xl">Tableau de bord</h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          to="/nehub-53ff1f11/produits"
          icon={Package}
          label="Produits"
          value={products.length}
        />
        <KpiCard to="/nehub-53ff1f11/stocks" icon={PackageCheck} label="En stock" value={inStock} />
        <KpiCard
          to="/nehub-53ff1f11/stocks"
          search={{ stock: "out" }}
          icon={AlertTriangle}
          label="En rupture"
          value={outOfStock}
          valueClassName={outOfStock > 0 ? "text-destructive" : ""}
        />
        <KpiCard to="/nehub-53ff1f11/promotions" icon={Tag} label="En promotion" value={promos} />
        <KpiCard
          to="/nehub-53ff1f11/commandes"
          icon={ShoppingCart}
          label="Commandes"
          value={orders.length}
        />
        <KpiCard
          to="/nehub-53ff1f11/commandes"
          search={{ status: "Nouvelle" }}
          icon={Clock}
          label="Nouvelles commandes"
          value={pending}
        />
        <KpiCard
          to="/nehub-53ff1f11/comptabilite"
          icon={Wallet}
          label="Chiffre d'affaires encaissé"
          value={formatPrice(revenue, currency)}
          hint="Depuis le début"
        />
      </div>

      <section className="mt-5 border border-border p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Répartition du stock
        </h2>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden bg-muted">
          <div
            className="h-full bg-success"
            style={{ width: `${(healthyStock / Math.max(1, products.length)) * 100}%` }}
          />
          <div
            className="h-full bg-warning"
            style={{ width: `${(lowStock / Math.max(1, products.length)) * 100}%` }}
          />
          <div
            className="h-full bg-destructive"
            style={{ width: `${(outOfStock / Math.max(1, products.length)) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link to="/nehub-53ff1f11/stocks" className="flex items-center gap-1.5 hover:underline">
            <span className="size-2 bg-success" aria-hidden="true" />
            {healthyStock} en stock
          </Link>
          <Link
            to="/nehub-53ff1f11/stocks"
            search={{ stock: "low" }}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="size-2 bg-warning" aria-hidden="true" />
            {lowStock} stock faible
          </Link>
          <Link
            to="/nehub-53ff1f11/stocks"
            search={{ stock: "out" }}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="size-2 bg-destructive" aria-hidden="true" />
            {outOfStock} en rupture
          </Link>
        </div>
      </section>

      <section className="mt-8 border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Chiffre d'affaires</h2>
            <p className="text-xs text-muted-foreground">
              Tendance des ventes payées sur la période choisie
            </p>
          </div>
          <PeriodPicker
            value={periodKey}
            onChange={setPeriodKey}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {formatPrice(periodRevenue, currency)}
          </span>
          <span className="text-sm text-muted-foreground">sur la période</span>
          <TrendBadge current={periodRevenue} previous={previousRevenue} />
        </div>
        <div className="mt-4">
          {trend.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune vente sur la période.
            </p>
          ) : (
            <TrendAreaChart
              data={trend.map((t) => ({ label: t.label, primary: t.revenue }))}
              primaryLabel="CA"
              valueFormatter={(v) => formatPrice(v, currency)}
            />
          )}
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg">Comptabilité</h2>
        <Link
          to="/nehub-53ff1f11/comptabilite"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Voir le détail complet →
        </Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          to="/nehub-53ff1f11/comptabilite"
          icon={TrendingUp}
          label="Bénéfice encaissé"
          value={formatPrice(profit, currency)}
          valueClassName={profit >= 0 ? "text-success" : "text-destructive"}
        />
        <KpiCard
          to="/nehub-53ff1f11/comptabilite"
          icon={Percent}
          label="Marge nette"
          value={`${margin}%`}
          valueClassName={margin >= 0 ? "text-success" : "text-destructive"}
        />
        <KpiCard
          to="/nehub-53ff1f11/stocks"
          icon={Archive}
          label="Valeur du stock (achat)"
          value={formatPrice(stockValue, currency)}
        />
        <KpiCard
          to="/nehub-53ff1f11/stocks"
          icon={TrendingUp}
          label="Bénéfice potentiel (stock actuel)"
          value={formatPrice(potentialProfit, currency)}
          valueClassName={potentialProfit >= 0 ? "text-success" : "text-destructive"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-border">
          <h2 className="border-b border-border p-4 text-base">Produits les plus vendus</h2>
          {bestSellers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune vente pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {bestSellers.map((p) => (
                <li key={p.id} className="p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/nehub-53ff1f11/produits/$id"
                      params={{ id: p.id }}
                      className="truncate font-medium hover:underline"
                    >
                      {p.brand} {p.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">{p.sold} vendus</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted">
                    <div
                      className="h-1.5 bg-foreground"
                      style={{ width: `${Math.max(4, (p.sold / bestSellersMax) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border">
          <h2 className="border-b border-border p-4 text-base">Dernières commandes</h2>
          {orders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucune commande pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <Link
                      to="/nehub-53ff1f11/commandes/$id"
                      params={{ id: o.id }}
                      className="font-medium hover:underline"
                    >
                      #{o.orderNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(o.total, currency)}</div>
                    <div className="text-xs text-muted-foreground">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
