import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_type: string;
  discount_value: number;
  total: number;
  stock_deducted: boolean;
  created_at: string;
  products?: {
    id: string;
    name: string;
    sku: string | null;
    sale_price: number | null;
    cost_price: number | null;
  } | null;
}

export interface SaleItemInsert {
  sale_id: string;
  product_id?: string | null;
  description: string;
  qty?: number;
  unit_price?: number;
  discount_type?: string;
  discount_value?: number;
  total: number;
}

export interface SaleItemUpdate {
  id: string;
  product_id?: string | null;
  description?: string;
  qty?: number;
  unit_price?: number;
  discount_type?: string;
  discount_value?: number;
  total?: number;
  stock_deducted?: boolean;
}

export const useSaleItems = (saleId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["sale-items", saleId],
    queryFn: async () => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          *,
          products (
            id,
            name,
            sku,
            sale_price,
            cost_price
          )
        `)
        .eq("sale_id", saleId)
        .order("created_at");

      if (error) throw error;
      return data as SaleItem[];
    },
    enabled: !!saleId,
  });

  const createItem = useMutation({
    mutationFn: async (item: SaleItemInsert) => {
      const { data, error } = await supabase
        .from("sale_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (error) => {
      console.error("Error creating sale item:", error);
      toast.error("Erro ao adicionar item");
    },
  });

  const createManyItems = useMutation({
    mutationFn: async (items: SaleItemInsert[]) => {
      const { data, error } = await supabase
        .from("sale_items")
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (error) => {
      console.error("Error creating sale items:", error);
      toast.error("Erro ao adicionar itens");
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: SaleItemUpdate) => {
      const { data, error } = await supabase
        .from("sale_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (error) => {
      console.error("Error updating sale item:", error);
      toast.error("Erro ao atualizar item");
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sale_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (error) => {
      console.error("Error deleting sale item:", error);
      toast.error("Erro ao remover item");
    },
  });

  const deleteAllItems = useMutation({
    mutationFn: async (saleIdToDelete: string) => {
      const { error } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleIdToDelete);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-items", saleId] });
    },
    onError: (error) => {
      console.error("Error deleting all sale items:", error);
      toast.error("Erro ao remover itens");
    },
  });

  // Calculate totals
  const subtotal = items?.reduce((sum, item) => sum + item.total, 0) || 0;

  return {
    items: items || [],
    isLoading,
    error,
    subtotal,
    createItem,
    createManyItems,
    updateItem,
    deleteItem,
    deleteAllItems,
  };
};
