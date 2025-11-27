import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  renavam: string | null;
  current_odometer_km: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleInsert {
  name: string;
  plate: string;
  renavam?: string;
  current_odometer_km?: number;
  active?: boolean;
}

export const useVehicles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Vehicle[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (vehicle: VehicleInsert) => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicle])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Sucesso",
        description: "Veículo criado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar veículo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...vehicle }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(vehicle)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Sucesso",
        description: "Veículo atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar veículo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({
        title: "Sucesso",
        description: "Veículo excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir veículo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    vehicles,
    isLoading,
    createVehicle: createMutation.mutate,
    updateVehicle: updateMutation.mutate,
    deleteVehicle: deleteMutation.mutate,
  };
};
