import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type StatusType = 'tecnico' | 'comercial';

export interface ServiceCallStatus {
  id: string;
  name: string;
  color: string;
  active: boolean;
  is_default: boolean;
  display_order: number;
  status_type: StatusType;
  created_at: string;
  updated_at: string;
}

export interface ServiceCallStatusInsert {
  name: string;
  color: string;
  active?: boolean;
  is_default?: boolean;
  display_order?: number;
  status_type: StatusType;
}

export const useServiceCallStatuses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["service-call-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_call_statuses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ServiceCallStatus[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses raramente mudam
    gcTime: 30 * 60 * 1000,   // 30 minutos no cache
  });

  const createMutation = useMutation({
    mutationFn: async (newStatus: ServiceCallStatusInsert) => {
      const { data, error } = await supabase
        .from("service_call_statuses")
        .insert([newStatus])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-statuses"] });
      toast({
        title: "Sucesso",
        description: "Status criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCallStatus> & { id: string }) => {
      const { data, error } = await supabase
        .from("service_call_statuses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-statuses"] });
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_call_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-statuses"] });
      toast({
        title: "Sucesso",
        description: "Status excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    statuses,
    isLoading,
    createStatus: createMutation.mutate,
    updateStatus: updateMutation.mutate,
    deleteStatus: deleteMutation.mutate,
  };
};
