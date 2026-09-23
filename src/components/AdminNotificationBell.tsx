import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { computeCategoryRows, PAID_STATUSES } from "@/lib/accounting";
import { useAdminOrders } from "@/lib/api/orders";
import { useAdminProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";

/** Bell dropdown for in-app-only admin alerts: new orders still untreated,
 * and categories whose 30-day margin has dropped under the configurable
 * threshold (Paramètres) — no email/SMS/WhatsApp involved, see roadmap. */
export function AdminNotificationBell() {
  const qc = useQueryClient();
  const { data: orders = [] } = useAdminOrders();
  const { data: products = [] } = useAdminProducts();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel("admin-new-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const orderNumber = (payload.new as { order_number?: string }).order_number;
        toast(`Nouvelle commande${orderNumber ? ` #${orderNumber}` : ""} reçue.`);
        void qc.invalidateQueries({ queryKey: ["orders"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const newOrders = useMemo(() => orders.filter((o) => o.status === "Nouvelle"), [orders]);

  const lowMarginCategories = useMemo(() => {
    if (!settings) return [];
    const threshold = settings.lowMarginThreshold;
    const categoryByProductId = new Map(products.map((p) => [p.id, p.category]));
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recentPaid = orders.filter(
      (o) => PAID_STATUSES.includes(o.status) && new Date(o.createdAt) >= since,
    );
    return computeCategoryRows(recentPaid, categoryByProductId).filter((r) => r.margin < threshold);
  }, [orders, products, settings]);

  const count = newOrders.length + lowMarginCategories.length;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${count > 0 ? `, ${count} alerte(s)` : ""}`}
        className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 border border-border bg-background shadow-lg">
          <div className="border-b border-border p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Notifications
          </div>
          {count === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Rien à signaler.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {newOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    to="/nehub-53ff1f11/commandes/$id"
                    params={{ id: o.id }}
                    onClick={() => setOpen(false)}
                    className="block p-3 text-sm hover:bg-muted"
                  >
                    Nouvelle commande <span className="font-semibold">#{o.orderNumber}</span> à
                    traiter
                  </Link>
                </li>
              ))}
              {lowMarginCategories.map((c) => (
                <li key={c.name}>
                  <Link
                    to="/nehub-53ff1f11/comptabilite"
                    onClick={() => setOpen(false)}
                    className="block p-3 text-sm hover:bg-muted"
                  >
                    Marge basse sur <span className="font-semibold">{c.name}</span> ({c.margin}% sur
                    30 jours)
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
