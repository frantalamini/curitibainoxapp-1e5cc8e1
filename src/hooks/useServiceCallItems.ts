import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ItemType = "PRODUCT" | "SERVICE" | "FEE" | "DISCOUNT";

export interface ServiceCallItem {
  id: string;
  service_call_id: string;
  type: ItemType;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_value: number;
  total: number;
  created_at: string;
  products?: {
    id: string;
    sku: string | null;
    name: string;
    unit: string | null;
  } | null;
}

export interface ServiceCallItemInsert {
  service_call_id: string;
  type: ItemType;
  product_id?: string | null;
  description: string;
  qty?: number;
  unit_price?: number;
  discount_value?: number;
  total: number;
}

export const useServiceCallItems = (serviceCallId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["service-call-items", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return [];
      
      const { data, error } = await supabase
        .from("service_call_items")
        .select(`
          *,
          products (
            id,
            sku,
            name,
            unit
          )
        `)
        .eq("service_call_id", serviceCallId)
        .order("created_at");

      if (error) throw error;
      return data as ServiceCallItem[];
    },
    enabled: !!serviceCallId,
  });

  const createItem = useMutation({
    mutationFn: async (item: ServiceCallItemInsert) => {
      const { data, error } = await supabase
        .from("service_call_items")
        .insert(item)
        .select(`
          *,
          products (
            id,
            sku,
            name,
            unit
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-items", serviceCallId] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCallItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("service_call_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-items", serviceCallId] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_call_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-items", serviceCallId] });
    },
  });

  // Calculate totals
  const productItems = items?.filter(i => i.type === "PRODUCT") || [];
  const serviceItems = items?.filter(i => i.type === "SERVICE") || [];
  const feeItems = items?.filter(i => i.type === "FEE") || [];
  const discountItems = items?.filter(i => i.type === "DISCOUNT") || [];

  const totalProducts = productItems.reduce((sum, i) => sum + i.total, 0);
  const totalServices = serviceItems.reduce((sum, i) => sum + i.total, 0);
  const totalFees = feeItems.reduce((sum, i) => sum + i.total, 0);
  const totalDiscounts = discountItems.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = totalProducts + totalServices + totalFees - totalDiscounts;

  return {
    items: items || [],
    productItems,
    serviceItems,
    feeItems,
    discountItems,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    totals: {
      products: totalProducts,
      services: totalServices,
      fees: totalFees,
      discounts: totalDiscounts,
      grand: grandTotal,
    },
  };
};
