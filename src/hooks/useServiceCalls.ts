import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ServiceCall {
  id: string;
  client_id: string;
  equipment_description: string;
  urgency: "corrective" | "preventive";
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCallInsert {
  client_id: string;
  equipment_description: string;
  urgency: "corrective" | "preventive";
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
}

export const useServiceCalls = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceCalls, isLoading } = useQuery({
    queryKey: ["service-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_calls")
        .select("*")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data as ServiceCall[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newServiceCall: ServiceCallInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("service_calls")
        .insert([{ ...newServiceCall, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-calls"] });
      toast({
        title: "Sucesso",
        description: "Chamado técnico criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar chamado técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    serviceCalls,
    isLoading,
    createServiceCall: createMutation.mutate,
  };
};
