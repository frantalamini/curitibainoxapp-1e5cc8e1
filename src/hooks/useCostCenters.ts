import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CostCenter {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CostCenterInsert = Omit<CostCenter, "id" | "created_at" | "updated_at">;
export type CostCenterUpdate = Partial<CostCenterInsert>;

export const useCostCenters = () => {
  const queryClient = useQueryClient();

  const { data: costCenters = [], isLoading, error } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as CostCenter[];
    },
  });

  const createCostCenter = useMutation({
    mutationFn: async (costCenter: CostCenterInsert) => {
      const { data, error } = await supabase
        .from("cost_centers")
        .insert(costCenter)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      toast.success("Centro de custo criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar centro de custo: ${error.message}`);
    },
  });

  const updateCostCenter = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & CostCenterUpdate) => {
      const { data, error } = await supabase
        .from("cost_centers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      toast.success("Centro de custo atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar centro de custo: ${error.message}`);
    },
  });

  const deleteCostCenter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cost_centers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      toast.success("Centro de custo excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir centro de custo: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("cost_centers")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    costCenters,
    activeCostCenters: costCenters.filter((c) => c.is_active),
    isLoading,
    error,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
    toggleActive,
  };
};
