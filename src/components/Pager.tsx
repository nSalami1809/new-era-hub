/** Page-number pagination (Précédent/Suivant + "Page X/Y — N résultats"),
 * shared by the admin Produits and Commandes lists. `page` is 0-indexed. */
export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        Page {page + 1}/{pageCount} — {total} résultat{total > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </button>
        <button
          type="button"
          className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
          disabled={page + 1 >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
