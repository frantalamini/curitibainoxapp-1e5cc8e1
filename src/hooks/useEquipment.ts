import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Equipment = {
  id: string;
  client_id: string;
  brand: string;
  model: string;
  serial_number?: string;
  imei?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type EquipmentInsert = Omit<Equipment, "id" | "created_at" | "updated_at">;

export const useEquipment = (clientId?: string) => {
  const queryClient = useQueryClient();

  const { data: equipment, isLoading } = useQuery({
    queryKey: clientId ? ["equipment", clientId] : ["equipment"],
    queryFn: async () => {
      let query = supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const createEquipment = useMutation({
    mutationFn: async (equipment: EquipmentInsert) => {
      const { data, error } = await supabase
        .from("equipment")
        .insert([equipment])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Equipamento criado",
        description: "Equipamento criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar equipamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, ...equipment }: Partial<Equipment> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(equipment)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Equipamento atualizado",
        description: "Equipamento atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar equipamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "Equipamento excluído",
        description: "Equipamento excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir equipamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    equipment,
    isLoading,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  };
};
