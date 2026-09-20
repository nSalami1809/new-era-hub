import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate, formatPrice } from "@/lib/format";
import { useProducts } from "@/lib/api/products";
import { useAdminOrders } from "@/lib/api/orders";
import { useSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useAdminOrders();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";

  const inStock = products.filter((p) => p.stock > 0).length;
  const outOfStock = products.filter((p) => p.stock <= 0).length;
  const promos = products.filter((p) => p.promotionalPrice && p.promotionalPrice < p.price).length;
  const paidStatuses = ["Payée", "En préparation", "Expédiée", "Livrée"];
  const revenue = orders.filter((o) => paidStatuses.includes(o.status)).reduce((n, o) => n + o.total, 0);
  const pending = orders.filter((o) => o.status === "Nouvelle").length;
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const stats = [
    { label: "Produits", value: String(products.length) },
    { label: "En stock", value: String(inStock) },
    { label: "En rupture", value: String(outOfStock) },
    { label: "En promotion", value: String(promos) },
    { label: "Commandes", value: String(orders.length) },
    { label: "Nouvelles commandes", value: String(pending) },
    { label: "Chiffre d'affaires encaissé", value: formatPrice(revenue, currency) },
  ];

  return (
    <div>
      <h1 className="text-2xl">Tableau de bord</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-border p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-border">
          <h2 className="border-b border-border p-4 text-base">Produits les plus vendus</h2>
          <ul className="divide-y divide-border">
            {bestSellers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <Link to="/admin/produits/$id" params={{ id: p.id }} className="font-medium hover:underline">
                  {p.brand} {p.name}
                </Link>
                <span className="text-muted-foreground">{p.sold} vendus</span>
              </li>
            ))}
          </ul>
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
                    <Link to="/admin/commandes/$id" params={{ id: o.id }} className="font-medium hover:underline">
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
