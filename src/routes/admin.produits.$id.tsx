import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";
import { useProduct, useUpdateProduct } from "@/lib/api/products";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/produits/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useProduct(id);
  const updateProduct = useUpdateProduct();
  const navigate = useNavigate();

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (!product) {
    return (
      <div>
        <h1 className="text-2xl">Produit introuvable</h1>
        <Link to="/admin/produits" className="btn-base btn-outline mt-4">
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/produits" className="text-sm underline">
        ← Retour aux produits
      </Link>
      <h1 className="mt-2 text-2xl">Modifier : {product.name}</h1>
      <ProductForm
        product={product}
        submitLabel="Enregistrer les modifications"
        onSubmit={async (input) => {
          await updateProduct.mutateAsync({
            id: product.id,
            patch: input,
            stockReason: "Modification depuis la fiche produit",
          });
          toast("Produit mis à jour.");
          navigate({ to: "/admin/produits" });
        }}
      />
    </div>
  );
}
