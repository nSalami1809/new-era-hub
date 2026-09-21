import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/lib/api/categories";

export const Route = createFileRoute("/nehub-53ff1f11/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Le nom de la catégorie doit contenir au moins 2 caractères.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("Cette catégorie existe déjà.");
      return;
    }
    setError("");
    createCategory.mutate(trimmed, {
      onSuccess: () => setName(""),
      onError: (err) => setError(err instanceof Error ? err.message : "Erreur, réessayez."),
    });
  }

  function remove(id: string) {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    deleteCategory.mutate(id, {
      onError: (err) => setError(err instanceof Error ? err.message : "Erreur, réessayez."),
    });
  }

  return (
    <div>
      <h1 className="text-2xl">Catégories de produits</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez les catégories proposées à la création/modification d'un produit et dans les filtres
        de la boutique.
      </p>

      <form onSubmit={submit} className="mt-6 flex max-w-md flex-wrap items-end gap-2">
        <div className="flex-1">
          <label htmlFor="new-category" className="mb-1 block text-sm font-medium">
            Nouvelle catégorie
          </label>
          <input
            id="new-category"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="Ex : Sacs"
            className="field"
          />
        </div>
        <button
          type="submit"
          disabled={createCategory.isPending || !name.trim()}
          className="btn-base btn-success"
        >
          Ajouter
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement...</p>
      ) : categories.length === 0 ? (
        <p className="mt-6 border border-border p-6 text-sm text-muted-foreground">
          Aucune catégorie pour le moment.
        </p>
      ) : (
        <div className="mt-6 max-w-md overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">Nom</th>
                <th className="p-3">Créée le</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
