import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { useCreateProduct } from "@/lib/api/products";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/nehub-53ff1f11/produits/nouveau")({
  component: NewProduct,
});

function NewProduct() {
  const createProduct = useCreateProduct();
  const navigate = useNavigate();
  return (
    <div>
      <Link
        to="/nehub-53ff1f11/produits"
        className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
      >
        <ArrowLeft size={14} />
        Retour aux produits
      </Link>
      <h1 className="mt-2 text-2xl">Nouveau produit</h1>
      <ProductForm
        submitLabel="Créer le produit"
        onSubmit={async (input) => {
          await createProduct.mutateAsync(input);
          toast("Produit créé.");
          navigate({ to: "/nehub-53ff1f11/produits" });
        }}
      />
    </div>
  );
}
