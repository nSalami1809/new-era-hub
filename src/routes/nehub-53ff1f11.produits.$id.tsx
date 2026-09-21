import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { Skeleton } from "@/components/Skeleton";
import { useAdminProduct, useUpdateProduct, type ProductInput } from "@/lib/api/products";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/nehub-53ff1f11/produits/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useAdminProduct(id);
  const updateProduct = useUpdateProduct();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-4 h-8 w-64" />
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[42px] w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <h1 className="text-2xl">Produit introuvable</h1>
        <Link to="/nehub-53ff1f11/produits" className="btn-base btn-outline mt-4">
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/nehub-53ff1f11/produits"
        className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
      >
        <ArrowLeft size={14} />
        Retour aux produits
      </Link>
      <h1 className="mt-2 text-2xl">Modifier : {product.name}</h1>
      <ProductForm
        product={product}
        submitLabel="Enregistrer les modifications"
        onSubmit={async (input) => {
          // A product with sizes has its stock computed from those sizes —
          // never send a flat `stock` for it, or adjust_stock will reject
          // the update (it must go through the per-size stock endpoints).
          const patch: Partial<ProductInput> = { ...input };
          if (product.variants.length > 0) delete patch.stock;
          await updateProduct.mutateAsync({
            id: product.id,
            patch,
            stockReason: "Modification depuis la fiche produit",
          });
          toast("Produit mis à jour.");
          navigate({ to: "/nehub-53ff1f11/produits" });
        }}
      />
    </div>
  );
}
