import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StockMovementType = "IN" | "OUT" | "ADJUST";

export interface StockMovement {
  id: string;
  product_id: string;
  type: StockMovementType;
  qty: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockMovementInsert {
  product_id: string;
  type: StockMovementType;
  qty: number;
  unit_cost?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
}

export const useStockMovements = (productId?: string) => {
  const queryClient = useQueryClient();

  // Get movements for a specific product
  const { data: movements, isLoading } = useQuery({
    queryKey: ["stock-movements", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StockMovement[];
    },
    enabled: !!productId,
  });

  // Create a stock movement
  const createMovement = useMutation({
    mutationFn: async (movement: StockMovementInsert) => {
      const { data, error } = await supabase
        .from("stock_movements")
        .insert(movement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Create stock OUT movement for service call items
  const createServiceCallMovement = useMutation({
    mutationFn: async ({
      productId,
      qty,
      serviceCallId,
      notes,
    }: {
      productId: string;
      qty: number;
      serviceCallId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("stock_movements")
        .insert({
          product_id: productId,
          type: "OUT" as StockMovementType,
          qty,
          reference_type: "SERVICE_CALL",
          reference_id: serviceCallId,
          notes: notes || `Baixa automática - OS`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    movements: movements || [],
    isLoading,
    createMovement,
    createServiceCallMovement,
  };
};
