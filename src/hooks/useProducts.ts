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
  // New fields
  type: string | null;
  brand: string | null;
  model: string | null;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  ncm: string | null;
  gtin: string | null;
  cest: string | null;
  origin: string | null;
  tax_icms: number | null;
  tax_pis: number | null;
  tax_cofins: number | null;
  cost_price: number | null;
  sale_price: number | null;
  markup: number | null;
  track_stock: boolean | null;
  min_stock: number | null;
  // Computed from view
  stock_balance?: number | null;
}

export interface ProductInsert {
  sku?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  unit_price?: number | null;
  active?: boolean | null;
  type?: string | null;
  brand?: string | null;
  model?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  ncm?: string | null;
  gtin?: string | null;
  cest?: string | null;
  origin?: string | null;
  tax_icms?: number | null;
  tax_pis?: number | null;
  tax_cofins?: number | null;
  cost_price?: number | null;
  sale_price?: number | null;
  markup?: number | null;
  track_stock?: boolean | null;
  min_stock?: number | null;
}

export const useProducts = () => {
  const queryClient = useQueryClient();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      // First get products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");

      if (productsError) throw productsError;

      // Then get stock balances
      const { data: stockData, error: stockError } = await supabase
        .from("product_stock_balance")
        .select("*");

      if (stockError) {
        console.warn("Could not fetch stock balances:", stockError);
        return productsData as Product[];
      }

      // Merge stock balances into products
      const stockMap = new Map(stockData?.map(s => [s.product_id, s.balance]) || []);
      
      return (productsData || []).map(p => ({
        ...p,
        stock_balance: stockMap.get(p.id) ?? 0,
      })) as Product[];
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
