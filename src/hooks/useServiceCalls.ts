import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ServiceCall {
  id: string;
  os_number: number;
  client_id: string;
  equipment_description: string;
  problem_description?: string;
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  audio_url?: string;
  media_urls?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  service_type_id?: string;
  technical_diagnosis?: string;
  technical_diagnosis_audio_url?: string;
  photos_before_urls?: string[];
  video_before_url?: string;
  photos_after_urls?: string[];
  video_after_url?: string;
  checklist_id?: string;
  checklist_responses?: Record<string, boolean>;
  customer_name?: string;
  customer_position?: string;
  technician_signature_url?: string;
  technician_signature_data?: string;
  customer_signature_url?: string;
  customer_signature_data?: string;
  technician_signature_date?: string;
  customer_signature_date?: string;
  clients?: {
    full_name: string;
    phone: string;
    address?: string;
  };
  technicians?: {
    full_name: string;
    phone: string;
  };
  service_types?: {
    name: string;
    color: string;
  };
}

export interface ServiceCallInsert {
  client_id: string;
  equipment_description: string;
  problem_description?: string;
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
  audio_url?: string;
  media_urls?: string[];
  service_type_id?: string;
}

export const useServiceCall = (id?: string) => {
  return useQuery({
    queryKey: ["service-call", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          *,
          clients (
            full_name,
            phone,
            address
          ),
          technicians (
            full_name,
            phone
          ),
          service_types (
            name,
            color
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ServiceCall;
    },
    enabled: !!id,
  });
};

export const useServiceCalls = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceCalls, isLoading } = useQuery({
    queryKey: ["service-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          *,
          clients (
            full_name,
            phone,
            address
          ),
          technicians (
            full_name,
            phone
          ),
          service_types (
            name,
            color
          )
        `)
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCall> & { id: string }) => {
      const { data, error } = await supabase
        .from("service_calls")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-calls"] });
      toast({
        title: "Sucesso",
        description: "Chamado técnico atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar chamado técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_calls")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-calls"] });
      toast({
        title: "Sucesso",
        description: "Chamado técnico excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir chamado técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    serviceCalls,
    isLoading,
    createServiceCall: createMutation.mutate,
    updateServiceCall: updateMutation.mutate,
    deleteServiceCall: deleteMutation.mutate,
  };
};
