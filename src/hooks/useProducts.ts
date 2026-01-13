import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  unit_price: number | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductInsert {
  sku?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  unit_price?: number | null;
  active?: boolean | null;
}

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    products: products || [],
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
