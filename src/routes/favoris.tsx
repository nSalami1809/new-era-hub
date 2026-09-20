import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { useProducts } from "@/lib/api/products";
import { useSettings } from "@/lib/api/settings";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [
      { title: "Mes favoris | New Era Hub 241" },
      { name: "description", content: "Retrouvez les produits que vous avez mis de côté." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const favoriteIds = useFavorites();
  const { data: products = [], isLoading } = useProducts();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "FCFA";

  const favorites = products.filter((p) => p.isActive && favoriteIds.includes(p.id));

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="text-2xl sm:text-3xl">Mes favoris</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {favorites.length} produit{favorites.length > 1 ? "s" : ""} mis de côté.
        </p>

        {isLoading ? (
          <div className="mt-6">
            <ProductGridSkeleton count={4} />
          </div>
        ) : favorites.length === 0 ? (
          <div className="mt-10 border border-border p-10 text-center">
            <p className="font-semibold">Vous n'avez pas encore de favoris.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Appuyez sur le cœur d'un produit pour le retrouver ici.
            </p>
            <Link to="/boutique" className="btn-base btn-dark mt-6">
              Parcourir la boutique
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {favorites.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
