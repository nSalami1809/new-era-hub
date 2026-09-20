import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductReview = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    isApproved: row.is_approved,
    createdAt: row.created_at,
  };
}

/** Approved reviews for one product — what the storefront shows. */
export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async (): Promise<ProductReview[]> => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId as string)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapReview);
    },
    enabled: !!productId,
  });
}

/** Every review across every product — admin moderation queue. */
export function useAdminReviews() {
  return useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async (): Promise<ProductReview[]> => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapReview);
    },
  });
}

export function useCreateReview() {
  return useMutation({
    mutationFn: async (input: {
      productId: string;
      authorName: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: input.productId,
        author_name: input.authorName,
        rating: input.rating,
        comment: input.comment,
      });
      if (error) throw error;
    },
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
