import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";
import { useCreateProduct } from "@/lib/api/products";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/admin/produits/nouveau")({
  component: NewProduct,
});

function NewProduct() {
  const createProduct = useCreateProduct();
  const navigate = useNavigate();
  return (
    <div>
      <Link to="/admin/produits" className="text-sm underline">
        ← Retour aux produits
      </Link>
      <h1 className="mt-2 text-2xl">Nouveau produit</h1>
      <ProductForm
        submitLabel="Créer le produit"
        onSubmit={async (input) => {
          await createProduct.mutateAsync(input);
          toast("Produit créé.");
          navigate({ to: "/admin/produits" });
        }}
      />
    </div>
  );
}
