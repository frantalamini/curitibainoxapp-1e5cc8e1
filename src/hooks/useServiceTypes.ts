import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ServiceType {
  id: string;
  name: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceTypeInsert {
  name: string;
  color: string;
  active?: boolean;
}

export const useServiceTypes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceTypes, isLoading } = useQuery({
    queryKey: ["service-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ServiceType[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newServiceType: ServiceTypeInsert) => {
      const { data, error } = await supabase
        .from("service_types")
        .insert([newServiceType])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      toast({
        title: "Sucesso",
        description: "Tipo de serviço criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao criar tipo de serviço: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceType> & { id: string }) => {
      const { data, error } = await supabase
        .from("service_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      toast({
        title: "Sucesso",
        description: "Tipo de serviço atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar tipo de serviço: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      toast({
        title: "Sucesso",
        description: "Tipo de serviço excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir tipo de serviço: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    serviceTypes,
    isLoading,
    createServiceType: createMutation.mutate,
    updateServiceType: updateMutation.mutate,
    deleteServiceType: deleteMutation.mutate,
  };
};
