import { createFileRoute } from "@tanstack/react-router";
import { useAdminReviews, useApproveReview, useDeleteReview } from "@/lib/api/reviews";
import { useProducts } from "@/lib/api/products";
import { formatDate } from "@/lib/format";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/nehub-53ff1f11/avis")({
  component: AdminReviews,
});

function AdminReviews() {
  const { data: reviews = [], isLoading } = useAdminReviews();
  const { data: products = [] } = useProducts();
  const approve = useApproveReview();
  const del = useDeleteReview();

  const pending = reviews.filter((r) => !r.isApproved);
  const approved = reviews.filter((r) => r.isApproved);

  function productLabel(productId: string) {
    const p = products.find((x) => x.id === productId);
    return p ? `${p.brand} ${p.name}` : "Produit supprimé";
  }

  return (
    <div>
      <h1 className="text-2xl">Avis clients</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {pending.length} avis en attente de validation.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : reviews.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucun avis pour le moment.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h2 className="mt-6 text-lg">En attente</h2>
              <div className="mt-3 flex flex-col gap-3">
                {pending.map((r) => (
                  <div key={r.id} className="border border-warning p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{productLabel(r.productId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.authorName} · {formatDate(r.createdAt)}
                        </div>
                      </div>
                      <StarRating value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-base btn-success !min-h-9 !px-3 !py-1.5 text-xs"
                        onClick={() => approve.mutate(r.id)}
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                        onClick={() => del.mutate(r.id)}
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {approved.length > 0 && (
            <>
              <h2 className="mt-8 text-lg">Publiés</h2>
              <div className="mt-3 flex flex-col gap-3">
                {approved.map((r) => (
                  <div key={r.id} className="border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{productLabel(r.productId)}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.authorName} · {formatDate(r.createdAt)}
                        </div>
                      </div>
                      <StarRating value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                        onClick={() => del.mutate(r.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
