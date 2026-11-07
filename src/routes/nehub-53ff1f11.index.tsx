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
  type LucideIcon,
} from "lucide-react";
import { TrendChart } from "@/components/TrendChart";
import { PeriodPicker } from "@/components/PeriodPicker";
import { formatDate, formatPrice } from "@/lib/format";
import { PAID_STATUSES, buildTrend } from "@/lib/accounting";
import { periodRange, type PeriodKey } from "@/lib/period";
import { useAdminProducts } from "@/lib/api/products";
import { useAdminOrders } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { effectivePrice, stockStatus, type Order } from "@/lib/types";

/** KPI tile shared by every stat below — icon + value + label, linking to
 * where that number actually lives. `to`/`search` are typed loosely here
 * (TanStack Router's route-literal typing doesn't survive being threaded
 * through a generic prop) — every call site below still passes a real,
 * existing route path. */
function KpiTile({
  to,
  search,
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="flex items-start gap-3 border border-border p-4 text-left transition-colors hover:bg-muted"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block text-xl font-bold ${valueClassName ?? ""}`}>{value}</span>
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

/** Rounded +/-% badge comparing a period's total to the immediately
 * preceding period of equal length — null (hidden) when there's no prior
 * period to compare against, rather than a misleading "+∞%". */
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
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

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          to="/nehub-53ff1f11/produits"
          icon={Package}
          label="Produits"
          value={products.length}
        />
        <KpiTile to="/nehub-53ff1f11/stocks" icon={PackageCheck} label="En stock" value={inStock} />
        <KpiTile
          to="/nehub-53ff1f11/stocks"
          search={{ stock: "out" }}
          icon={AlertTriangle}
          label="En rupture"
          value={outOfStock}
          valueClassName={outOfStock > 0 ? "text-destructive" : ""}
        />
        <KpiTile to="/nehub-53ff1f11/promotions" icon={Tag} label="En promotion" value={promos} />
        <KpiTile
          to="/nehub-53ff1f11/commandes"
          icon={ShoppingCart}
          label="Commandes"
          value={orders.length}
        />
        <KpiTile
          to="/nehub-53ff1f11/commandes"
          search={{ status: "Nouvelle" }}
          icon={Clock}
          label="Nouvelles commandes"
          value={pending}
        />
        <KpiTile
          to="/nehub-53ff1f11/comptabilite"
          icon={Wallet}
          label="Chiffre d'affaires encaissé"
          value={formatPrice(revenue, currency)}
        />
      </div>

      <section className="mt-5 border border-border p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Répartition du stock
        </h2>
        <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-sm bg-muted">
          <div
            className="h-full rounded-sm bg-success"
            style={{ width: `${(healthyStock / Math.max(1, products.length)) * 100}%` }}
          />
          <div
            className="h-full rounded-sm bg-warning"
            style={{ width: `${(lowStock / Math.max(1, products.length)) * 100}%` }}
          />
          <div
            className="h-full rounded-sm bg-destructive"
            style={{ width: `${(outOfStock / Math.max(1, products.length)) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link to="/nehub-53ff1f11/stocks" className="flex items-center gap-1.5 hover:underline">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            {healthyStock} en stock
          </Link>
          <Link
            to="/nehub-53ff1f11/stocks"
            search={{ stock: "low" }}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
            {lowStock} stock faible
          </Link>
          <Link
            to="/nehub-53ff1f11/stocks"
            search={{ stock: "out" }}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
            {outOfStock} en rupture
          </Link>
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
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          to="/nehub-53ff1f11/comptabilite"
          icon={TrendingUp}
          label="Bénéfice encaissé"
          value={formatPrice(profit, currency)}
          valueClassName={profit >= 0 ? "text-success" : "text-destructive"}
        />
        <KpiTile
          to="/nehub-53ff1f11/comptabilite"
          icon={Percent}
          label="Marge nette"
          value={`${margin}%`}
          valueClassName={margin >= 0 ? "text-success" : "text-destructive"}
        />
        <KpiTile
          to="/nehub-53ff1f11/stocks"
          icon={Archive}
          label="Valeur du stock (achat)"
          value={formatPrice(stockValue, currency)}
        />
        <KpiTile
          to="/nehub-53ff1f11/stocks"
          icon={TrendingUp}
          label="Bénéfice potentiel (stock actuel)"
          value={formatPrice(potentialProfit, currency)}
          valueClassName={potentialProfit >= 0 ? "text-success" : "text-destructive"}
        />
      </div>

      <section className="mt-8 border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base">Chiffre d'affaires</h2>
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
          <span className="text-2xl font-bold">{formatPrice(periodRevenue, currency)}</span>
          <span className="text-sm text-muted-foreground">sur la période</span>
          <TrendBadge current={periodRevenue} previous={previousRevenue} />
        </div>
        <div className="mt-4">
          {trend.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucune vente sur la période.
            </p>
          ) : (
            <TrendChart
              data={trend.map((t) => ({ label: t.label, value: t.revenue }))}
              valueFormatter={(v) => formatPrice(v, currency)}
            />
          )}
        </div>
      </section>

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
                  <div className="mt-2 h-1.5 rounded-sm bg-muted">
                    <div
                      className="h-1.5 rounded-sm bg-foreground"
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
