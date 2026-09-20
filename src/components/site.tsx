import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, Menu, X, Lock } from "lucide-react";
import { useState } from "react";
import { cartCount, useCart } from "@/lib/cart";
import { useSettings } from "@/lib/api/settings";
import { Toaster } from "@/components/Toaster";
import logo from "@/assets/logo-new-era-hub-241.jpeg";

const FALLBACK_STORE_NAME = "New Era Hub 241";

export function SiteHeader() {
  const cart = useCart();
  const { data: settings } = useSettings();
  const storeName = settings?.storeName ?? FALLBACK_STORE_NAME;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const count = cartCount(cart);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/boutique", search: { q: term || undefined } });
    setOpen(false);
  }

  const navItems = [
    { to: "/boutique" as const, search: {}, label: "Boutique" },
    { to: "/boutique" as const, search: { promo: true as const }, label: "Promotions" },
    { to: "/boutique" as const, search: { sort: "recent" as const }, label: "Nouveautés" },
  ];

  const desktopNavLinks = (
    <>
      {navItems.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          search={item.search}
          className="py-2 text-sm font-medium text-foreground hover:underline"
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="container-page flex h-20 items-center gap-4 sm:h-24">
        <button
          type="button"
          className="-ml-2 p-2 md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="flex items-center gap-2" aria-label={`${storeName} — Accueil`}>
          <img
            src={settings?.logoUrl ?? logo}
            alt={storeName}
            className="h-14 w-14 shrink-0 object-contain sm:h-[72px] sm:w-[72px]"
          />
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">{desktopNavLinks}</nav>

        <form onSubmit={submitSearch} className="ml-auto hidden items-center lg:flex">
          <label htmlFor="header-search" className="sr-only">
            Rechercher
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="header-search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Rechercher une casquette, une marque..."
              className="field !min-h-[38px] w-72 pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-3">
          <Link to="/boutique" className="p-2 lg:hidden" aria-label="Rechercher">
            <Search size={20} />
          </Link>
          <Link to="/admin" className="hidden p-2 text-muted-foreground hover:text-foreground sm:block" aria-label="Espace administrateur">
            <Lock size={18} />
          </Link>
          <Link to="/panier" className="relative flex items-center gap-2 p-2" aria-label={`Panier, ${count} article(s)`}>
            <ShoppingBag size={20} />
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
              {count}
            </span>
          </Link>
        </div>
      </div>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-border duration-150 md:hidden">
          <nav className="divide-y divide-border">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                onClick={() => setOpen(false)}
                className="container-page flex items-center py-3.5 text-base font-medium text-foreground active:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { data: settings } = useSettings();
  const storeName = settings?.storeName ?? FALLBACK_STORE_NAME;
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <img src={settings?.logoUrl ?? logo} alt={storeName} className="h-14 w-14 object-contain" />
          <p className="mt-3 text-sm text-muted-foreground">
            Casquettes sélectionnées, commande simple, paiement finalisé sur WhatsApp.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Contact</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {settings?.whatsappNumber && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  {settings.phone || settings.whatsappNumber} (WhatsApp)
                </a>
              </li>
            )}
            {settings?.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-foreground hover:underline">
                  {settings.email}
                </a>
              </li>
            )}
            <li>{settings?.address}</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">Navigation</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link to="/boutique" className="text-muted-foreground hover:text-foreground">
                Boutique
              </Link>
            </li>
            <li>
              <Link to="/panier" className="text-muted-foreground hover:text-foreground">
                Panier
              </Link>
            </li>
            <li>
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                Administration
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {storeName}. Tous droits réservés.
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Toaster />
    </div>
  );
}
