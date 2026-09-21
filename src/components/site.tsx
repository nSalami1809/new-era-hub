import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, Heart, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cartCount, useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { useSettings } from "@/lib/api/settings";
import { useProducts } from "@/lib/api/products";
import { formatPrice } from "@/lib/format";
import { effectivePrice, type Product } from "@/lib/types";
import { Toaster } from "@/components/Toaster";
import { ProductImage } from "@/components/ProductImage";
import logo from "@/assets/logo-new-era-hub-241.jpeg";

const FALLBACK_STORE_NAME = "New Era Hub 241";
const MAX_SUGGESTIONS = 5;

function SearchSuggestions({
  open,
  term,
  suggestions,
  currency,
  onSelect,
  onGoToResults,
}: {
  open: boolean;
  term: string;
  suggestions: Product[];
  currency: string;
  onSelect: () => void;
  onGoToResults: () => void;
}) {
  if (!open || suggestions.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
      <ul className="divide-y divide-border">
        {suggestions.map((p) => (
          <li key={p.id}>
            <Link
              to="/produit/$id"
              params={{ id: p.id }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onSelect}
              className="flex items-center gap-3 p-2.5 transition-colors hover:bg-muted"
            >
              <ProductImage
                src={p.images[0]}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.brand}</div>
              </div>
              <div className="shrink-0 text-sm font-semibold">
                {formatPrice(effectivePrice(p), currency)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onGoToResults}
        className="block w-full p-2.5 text-center text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Voir tous les résultats pour « {term} »
      </button>
    </div>
  );
}

export function SiteHeader() {
  const cart = useCart();
  const favorites = useFavorites();
  const { data: settings } = useSettings();
  const { data: products = [] } = useProducts();
  const storeName = settings?.storeName ?? FALLBACK_STORE_NAME;
  const currency = settings?.currency ?? "FCFA";
  const [open, setOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const location = useLocation();
  const currentQuery =
    typeof location.search === "object" && location.search && "q" in location.search
      ? String((location.search as Record<string, unknown>)["q"] ?? "")
      : "";
  const [term, setTerm] = useState(currentQuery);
  const navigate = useNavigate();
  const count = cartCount(cart);
  const favoritesCount = favorites.length;

  useEffect(() => {
    setTerm(currentQuery);
  }, [currentQuery]);

  const suggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) => p.isActive && [p.name, p.brand, p.sku].some((v) => v.toLowerCase().includes(q)),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [products, term]);

  function goToResults() {
    navigate({ to: "/boutique", search: { q: term || undefined } });
    setOpen(false);
    setSuggestionsOpen(false);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goToResults();
  }

  function closeSuggestions() {
    setSuggestionsOpen(false);
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
          activeOptions={{ exact: false, includeSearch: false }}
          className="group relative py-2 text-sm font-bold uppercase tracking-wide text-foreground"
        >
          {item.label}
          <span className="absolute inset-x-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100" />
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm print:hidden">
      <div className="container-page flex h-24 items-center gap-4 sm:h-28">
        <button
          type="button"
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-muted md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="flex items-center gap-3" aria-label={`${storeName} — Accueil`}>
          <img
            src={settings?.logoUrl ?? logo}
            alt={storeName}
            className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
          />
          <span className="hidden text-lg font-bold uppercase tracking-wide sm:block">
            {storeName}
          </span>
        </Link>

        <nav className="ml-8 hidden items-center gap-8 md:flex">{desktopNavLinks}</nav>

        <form onSubmit={submitSearch} className="ml-auto hidden items-center lg:flex">
          <label htmlFor="header-search" className="sr-only">
            Rechercher
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="header-search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              autoComplete="off"
              placeholder="Rechercher un produit, une marque..."
              className="field !min-h-[38px] w-72 border-transparent bg-muted pl-9 focus-visible:border-border-strong focus-visible:bg-background"
            />
            <SearchSuggestions
              open={suggestionsOpen}
              term={term}
              suggestions={suggestions}
              currency={currency}
              onSelect={closeSuggestions}
              onGoToResults={goToResults}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-3">
          <Link
            to="/favoris"
            className="hidden rounded-full p-2.5 text-foreground transition-colors hover:bg-muted sm:block"
            aria-label={`Favoris, ${favoritesCount} produit(s)`}
          >
            <Heart
              size={20}
              className={favoritesCount > 0 ? "fill-destructive text-destructive" : ""}
            />
          </Link>
          <Link
            to="/panier"
            className="relative flex items-center gap-2 rounded-full p-2.5 transition-colors hover:bg-muted"
            aria-label={`Panier, ${count} article(s)`}
          >
            <ShoppingBag size={20} />
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
              {count}
            </span>
          </Link>
        </div>
      </div>

      <form onSubmit={submitSearch} className="border-t border-border lg:hidden">
        <div className="container-page py-2.5">
          <label htmlFor="header-search-mobile" className="sr-only">
            Rechercher
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="header-search-mobile"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              autoComplete="off"
              placeholder="Rechercher un produit, une marque..."
              className="field !min-h-[40px] w-full border-transparent bg-muted pl-9 focus-visible:border-border-strong focus-visible:bg-background"
            />
            <SearchSuggestions
              open={suggestionsOpen}
              term={term}
              suggestions={suggestions}
              currency={currency}
              onSelect={closeSuggestions}
              onGoToResults={goToResults}
            />
          </div>
        </div>
      </form>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-border duration-150 md:hidden">
          <nav className="divide-y divide-border">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                onClick={() => setOpen(false)}
                className="container-page flex items-center py-3.5 text-base font-bold uppercase tracking-wide text-foreground active:bg-muted"
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
    <footer className="mt-16 rounded-t-3xl border-t border-border bg-muted/40 print:hidden">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <img
            src={settings?.logoUrl ?? logo}
            alt={storeName}
            className="h-14 w-14 object-contain"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Produits sélectionnés, commande simple, paiement finalisé sur WhatsApp.
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
                <a
                  href={`mailto:${settings.email}`}
                  className="hover:text-foreground hover:underline"
                >
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
              <Link to="/favoris" className="text-muted-foreground hover:text-foreground">
                Favoris
              </Link>
            </li>
            <li>
              <Link to="/suivi-commande" className="text-muted-foreground hover:text-foreground">
                Suivre ma commande
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {storeName}. Tous droits réservés.
        </p>
        <p className="mt-1 flex items-center justify-center gap-3">
          <Link to="/mentions-legales" className="hover:text-foreground hover:underline">
            Mentions légales
          </Link>
          <Link to="/confidentialite" className="hover:text-foreground hover:underline">
            Confidentialité
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Toaster />
    </div>
  );
}
