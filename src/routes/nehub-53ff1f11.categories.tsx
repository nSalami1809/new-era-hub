import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useSetCategorySizeType,
  useSetCategoryVisible,
  type ProductCategoryRow,
} from "@/lib/api/categories";
import { SIZE_TYPES, type SizeType } from "@/lib/types";

const SIZE_TYPE_LABEL: Record<SizeType, string> = {
  none: "Aucune taille",
  clothing: "Tailles (S, M, L...)",
  shoes: "Pointures (36, 37...)",
};

function SizeTypeSelect({
  value,
  onChange,
  id,
}: {
  value: SizeType;
  onChange: (v: SizeType) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="field !min-h-9 w-auto"
      value={value}
      onChange={(e) => onChange(e.target.value as SizeType)}
    >
      {SIZE_TYPES.map((t) => (
        <option key={t} value={t}>
          {SIZE_TYPE_LABEL[t]}
        </option>
      ))}
    </select>
  );
}

export const Route = createFileRoute("/nehub-53ff1f11/categories")({
  component: AdminCategories,
});

/** Click-to-rename name cell — commits on blur/Enter, same "tap to edit"
 * pattern as the stock quantity fields elsewhere in the admin. */
function CategoryNameCell({
  category,
  categories,
  onError,
  id,
}: {
  category: ProductCategoryRow;
  categories: ProductCategoryRow[];
  onError: (message: string) => void;
  id?: string;
}) {
  const renameCategory = useRenameCategory();
  const [draft, setDraft] = useState(category.name);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === category.name) {
      setDraft(category.name);
      return;
    }
    if (
      categories.some((c) => c.id !== category.id && c.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      onError("Cette catégorie existe déjà.");
      setDraft(category.name);
      return;
    }
    onError("");
    renameCategory.mutate(
      { categoryId: category.id, name: trimmed },
      { onError: (err) => onError(err instanceof Error ? err.message : "Erreur, réessayez.") },
    );
  }

  return (
    <input
      id={id}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label={`Renommer la catégorie ${category.name}`}
      className="field !min-h-9 w-full font-medium"
    />
  );
}

function AdminCategories() {
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const setSizeType = useSetCategorySizeType();
  const setVisible = useSetCategoryVisible();
  const [name, setName] = useState("");
  const [sizeType, setSizeTypeInput] = useState<SizeType>("none");
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
    createCategory.mutate(
      { name: trimmed, sizeType },
      {
        onSuccess: () => {
          setName("");
          setSizeTypeInput("none");
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Erreur, réessayez."),
      },
    );
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

      <form onSubmit={submit} className="mt-6 flex max-w-2xl flex-wrap items-end gap-2">
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
        <div>
          <label htmlFor="new-category-size-type" className="mb-1 block text-sm font-medium">
            Taille des produits
          </label>
          <SizeTypeSelect
            id="new-category-size-type"
            value={sizeType}
            onChange={setSizeTypeInput}
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
        <>
          {/* 5 colonnes (nom éditable, taille, visibilité, date, actions) ne
              tiennent pas sur un écran de téléphone même avec un défilement
              horizontal — mêmes cartes empilées que l'historique des
              mouvements de stock, pas de tableau à faire défiler sur mobile. */}
          <div className="mt-6 hidden max-w-2xl overflow-x-auto border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Nom</th>
                  <th className="p-3">Taille des produits</th>
                  <th className="p-3">Visibilité</th>
                  <th className="p-3">Créée le</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <CategoryNameCell category={c} categories={categories} onError={setError} />
                    </td>
                    <td className="p-3">
                      <SizeTypeSelect
                        value={c.sizeType}
                        onChange={(v) => setSizeType.mutate({ categoryId: c.id, sizeType: v })}
                      />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() =>
                          setVisible.mutate({ categoryId: c.id, isVisible: !c.isVisible })
                        }
                        className={`btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs ${
                          c.isVisible ? "" : "text-muted-foreground"
                        }`}
                      >
                        {c.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        {c.isVisible ? "Visible" : "Masquée"}
                      </button>
                    </td>
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

          <div className="mt-6 flex flex-col gap-3 sm:hidden">
            {categories.map((c) => (
              <div key={c.id} className="border border-border p-3">
                <label
                  htmlFor={`category-name-${c.id}`}
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  Nom
                </label>
                <CategoryNameCell
                  id={`category-name-${c.id}`}
                  category={c}
                  categories={categories}
                  onError={setError}
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`category-size-${c.id}`}
                      className="mb-1 block text-xs text-muted-foreground"
                    >
                      Taille des produits
                    </label>
                    <SizeTypeSelect
                      id={`category-size-${c.id}`}
                      value={c.sizeType}
                      onChange={(v) => setSizeType.mutate({ categoryId: c.id, sizeType: v })}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">Visibilité</span>
                    <button
                      type="button"
                      onClick={() =>
                        setVisible.mutate({ categoryId: c.id, isVisible: !c.isVisible })
                      }
                      className={`btn-base btn-outline !min-h-9 w-full !px-3 !py-1.5 text-xs ${
                        c.isVisible ? "" : "text-muted-foreground"
                      }`}
                    >
                      {c.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                      {c.isVisible ? "Visible" : "Masquée"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Créée le {formatDate(c.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="btn-base btn-danger !min-h-9 !px-3 !py-1.5 text-xs"
                    onClick={() => remove(c.id)}
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
