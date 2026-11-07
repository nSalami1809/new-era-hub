import { useMemo, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { Product } from "@/lib/types";

const MAX_PRODUCT_RESULTS = 8;

/** Recherche de produit par nom/marque/référence, avec une vignette photo à
 * côté de chaque résultat — remplace un <select> de texte brut, illisible
 * une fois le catalogue un peu grand. Partagé entre la saisie de vente hors
 * site (nouvelle vente) et l'ajout d'un article à une vente déjà enregistrée. */
export function ProductPicker({
  products,
  selected,
  onSelect,
}: {
  products: Product[];
  selected: Product | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? products.filter((p) => [p.name, p.brand, p.sku].some((v) => v.toLowerCase().includes(q)))
      : products;
    return pool.slice(0, MAX_PRODUCT_RESULTS);
  }, [products, query]);

  if (selected) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium">Produit</label>
        <div className="flex items-center gap-3 rounded-lg border border-border-strong bg-muted/40 p-2">
          <ProductImage
            src={selected.images[0]}
            alt=""
            width={40}
            className="h-10 w-10 shrink-0 rounded-md border border-border bg-white object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {selected.brand} {selected.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">{selected.sku}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect("");
              setQuery("");
            }}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor="product-search" className="mb-1 block text-sm font-medium">
        Produit
      </label>
      <input
        id="product-search"
        className="field"
        placeholder="Rechercher par nom, marque, référence..."
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
          <ul className="divide-y divide-border">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(p.id);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-muted"
                >
                  <ProductImage
                    src={p.images[0]}
                    alt=""
                    width={40}
                    className="h-10 w-10 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {p.brand} {p.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.sku} · stock {p.stock}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
