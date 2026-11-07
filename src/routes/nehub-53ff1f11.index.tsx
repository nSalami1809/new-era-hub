import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, formatPrice } from "@/lib/format";
import { PAID_STATUSES, buildTrend } from "@/lib/accounting";
import { useAdminProducts } from "@/lib/api/products";
import { useAdminOrders } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";
import { effectivePrice, stockStatus } from "@/lib/types";

const TREND_DAYS = 14;

export const Route = createFileRoute("/nehub-53ff1f11/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: products = [] } = useAdminProducts();
  const { data: orders = [] } = useAdminOrders();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";

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

  const trendEnd = new Date();
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
  const trend = buildTrend(paidOrders, trendStart, trendEnd);
  const trendMax = Math.max(1, ...trend.map((t) => t.revenue));

  const tileClassName = "border border-border p-4 text-left transition-colors hover:bg-muted";

  return (
    <div>
      <h1 className="text-2xl">Tableau de bord</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to="/nehub-53ff1f11/produits" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Produits</div>
          <div className="mt-1 text-xl font-bold">{products.length}</div>
        </Link>
        <Link to="/nehub-53ff1f11/stocks" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">En stock</div>
          <div className="mt-1 text-xl font-bold">{inStock}</div>
        </Link>
        <Link to="/nehub-53ff1f11/stocks" search={{ stock: "out" }} className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">En rupture</div>
          <div className="mt-1 text-xl font-bold">{outOfStock}</div>
        </Link>
        <Link to="/nehub-53ff1f11/promotions" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">En promotion</div>
          <div className="mt-1 text-xl font-bold">{promos}</div>
        </Link>
        <Link to="/nehub-53ff1f11/commandes" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Commandes</div>
          <div className="mt-1 text-xl font-bold">{orders.length}</div>
        </Link>
        <Link
          to="/nehub-53ff1f11/commandes"
          search={{ status: "Nouvelle" }}
          className={tileClassName}
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Nouvelles commandes
          </div>
          <div className="mt-1 text-xl font-bold">{pending}</div>
        </Link>
        <Link to="/nehub-53ff1f11/comptabilite" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Chiffre d'affaires encaissé
          </div>
          <div className="mt-1 text-xl font-bold">{formatPrice(revenue, currency)}</div>
        </Link>
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
        <Link to="/nehub-53ff1f11/comptabilite" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Bénéfice encaissé
          </div>
          <div
            className={`mt-1 text-xl font-bold ${profit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {formatPrice(profit, currency)}
          </div>
        </Link>
        <Link to="/nehub-53ff1f11/comptabilite" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Marge nette</div>
          <div
            className={`mt-1 text-xl font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}
          >
            {margin}%
          </div>
        </Link>
        <Link to="/nehub-53ff1f11/stocks" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Valeur du stock (achat)
          </div>
          <div className="mt-1 text-xl font-bold">{formatPrice(stockValue, currency)}</div>
        </Link>
        <Link to="/nehub-53ff1f11/stocks" className={tileClassName}>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Bénéfice potentiel (stock actuel)
          </div>
          <div
            className={`mt-1 text-xl font-bold ${potentialProfit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {formatPrice(potentialProfit, currency)}
          </div>
        </Link>
      </div>

      <section className="mt-8 border border-border">
        <h2 className="border-b border-border p-4 text-base">
          Chiffre d'affaires ({TREND_DAYS} derniers jours)
        </h2>
        {trend.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune vente sur la période.</p>
        ) : (
          <ul className="divide-y divide-border">
            {trend.map((t) => (
              <li key={t.label} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{t.label}</span>
                <div className="h-2.5 flex-1 rounded-sm bg-muted">
                  <div
                    className="h-2.5 rounded-sm bg-foreground"
                    style={{ width: `${Math.max(2, (t.revenue / trendMax) * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-medium">
                  {formatPrice(t.revenue, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
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
