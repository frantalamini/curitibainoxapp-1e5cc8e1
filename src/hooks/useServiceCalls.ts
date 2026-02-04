import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ServiceCall {
  seen_by_tech_at?: string;
  id: string;
  os_number: number;
  client_id: string;
  equipment_description: string;
  problem_description?: string;
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  status_id?: string;
  commercial_status_id?: string;
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
  equipment_serial_number?: string;
  internal_notes_text?: string;
  internal_notes_audio_url?: string;
  report_access_token?: string;
  clients?: {
    full_name: string;
    phone: string;
    phone_2?: string;
    address?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    nome_fantasia?: string;
    secondary_name?: string;
    responsible_financial?: { name?: string; phone?: string; email?: string } | null;
    responsible_technical?: { name?: string; phone?: string; email?: string } | null;
    responsible_legal?: { name?: string; phone?: string; email?: string } | null;
  };
  technicians?: {
    full_name: string;
    phone: string;
  };
  service_types?: {
    name: string;
    color: string;
  };
  service_call_statuses?: {
    name: string;
    color: string;
  };
  commercial_status?: {
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
  equipment_serial_number?: string;
  internal_notes_text?: string;
  internal_notes_audio_url?: string;
  purchase_order_number?: string;
  equipment_manufacturer?: string;
  equipment_sector?: string;
}

// Helper para sanitizar campos UUID (converte "" para null)
const UUID_FIELDS = [
  'service_type_id',
  'status_id',
  'commercial_status_id',
  'checklist_id',
  'client_id',
  'technician_id',
] as const;

const sanitizeUuidFields = <T extends object>(data: T): T => {
  const sanitized = { ...data } as Record<string, unknown>;
  UUID_FIELDS.forEach(field => {
    if (field in sanitized && sanitized[field] === '') {
      sanitized[field] = null;
    }
  });
  return sanitized as T;
};

// Query select fields para reutilização
const SERVICE_CALL_SELECT = `
  *,
  clients (
    full_name,
    phone,
    phone_2,
    address,
    nome_fantasia,
    secondary_name,
    responsible_financial,
    responsible_technical,
    responsible_legal
  ),
  technicians (
    full_name,
    phone
  ),
  service_types (
    name,
    color
  ),
  service_call_statuses!service_calls_status_id_fkey (
    name,
    color
  ),
  commercial_status:service_call_statuses!service_calls_commercial_status_id_fkey (
    name,
    color
  )
`;

const SERVICE_CALL_SELECT_FULL = `
  *,
  clients (
    full_name,
    phone,
    phone_2,
    address,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    cep,
    nome_fantasia,
    secondary_name,
    responsible_financial,
    responsible_technical,
    responsible_legal
  ),
  technicians (
    full_name,
    phone
  ),
  service_types (
    name,
    color
  ),
  service_call_statuses!service_calls_status_id_fkey (
    name,
    color
  ),
  commercial_status:service_call_statuses!service_calls_commercial_status_id_fkey (
    name,
    color
  )
`;

export const useServiceCall = (id?: string) => {
  return useQuery({
    queryKey: ["service-call", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("service_calls")
        .select(SERVICE_CALL_SELECT_FULL)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ServiceCall;
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos para dados de uma OS específica
  });
};

// Hook com paginação server-side
type UseServiceCallsFilters = {
  searchTerm?: string;
  statusId?: string;
  onlyNewForTechnicianId?: string;
};

export const useServiceCalls = (
  page: number = 1,
  pageSize: number = 30,
  filters: UseServiceCallsFilters = {}
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { searchTerm, statusId, onlyNewForTechnicianId } = filters;

  const { data, isLoading } = useQuery({
    queryKey: ["service-calls", page, pageSize, searchTerm, statusId, onlyNewForTechnicianId],
    queryFn: async () => {
      // Evita executar com token anônimo (quando a sessão ainda não foi carregada)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error("AUTH_SESSION_NOT_READY");
      }

      const normalizedSearch = searchTerm?.trim();

      // Se há termo de busca numérico, buscar por os_number exato primeiro
      if (normalizedSearch && /^\d+$/.test(normalizedSearch)) {
        const osNumber = parseInt(searchTerm.trim(), 10);
        const { data: exactMatch, error: exactError } = await supabase
          .from("service_calls")
          .select(SERVICE_CALL_SELECT)
          .eq("os_number", osNumber)
          .maybeSingle();
        
        if (!exactError && exactMatch) {
          return { serviceCalls: [exactMatch] as ServiceCall[], totalCount: 1 };
        }
      }

      // Calcular offset para paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Query com count
      let query = supabase
        .from("service_calls")
        .select(SERVICE_CALL_SELECT, { count: 'exact' })
        // Importante: ordenar por número da OS para paginação consistente
        .order("os_number", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Filtros server-side
      if (statusId) {
        query = query.eq("status_id", statusId);
      }

      if (onlyNewForTechnicianId) {
        query = query.eq("technician_id", onlyNewForTechnicianId).is("seen_by_tech_at", null);
      }

      if (normalizedSearch && !/^\d+$/.test(normalizedSearch)) {
        const like = `%${normalizedSearch}%`;
        
        // Buscar IDs de clientes e técnicos que correspondem à busca
        // (Supabase não suporta .or() com colunas de tabelas relacionadas)
        const [clientsResult, techniciansResult] = await Promise.all([
          supabase
            .from("clients")
            .select("id")
            .or(`full_name.ilike.${like},nome_fantasia.ilike.${like},secondary_name.ilike.${like}`),
          supabase
            .from("technicians")
            .select("id")
            .ilike("full_name", like)
        ]);

        const clientIds = clientsResult.data?.map(c => c.id) || [];
        const technicianIds = techniciansResult.data?.map(t => t.id) || [];

        // Construir filtros OR com os IDs encontrados
        const orFilters = [`equipment_description.ilike.${like}`];
        if (clientIds.length > 0) {
          orFilters.push(`client_id.in.(${clientIds.join(',')})`);
        }
        if (technicianIds.length > 0) {
          orFilters.push(`technician_id.in.(${technicianIds.join(',')})`);
        }

        query = query.or(orFilters.join(","));
      }

      const { data: calls, error, count } = await query;

      if (error) throw error;
      return { serviceCalls: calls as ServiceCall[], totalCount: count || 0 };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "AUTH_SESSION_NOT_READY") {
        return failureCount < 5;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(250 * (attemptIndex + 1), 1500),
  });

  const serviceCalls = data?.serviceCalls;
  const totalCount = data?.totalCount || 0;

  const createMutation = useMutation({
    mutationFn: async (newServiceCall: ServiceCallInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const sanitized = sanitizeUuidFields(newServiceCall);

      const { data, error } = await supabase
        .from("service_calls")
        .insert([{ ...sanitized, created_by: user.id }])
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
      const sanitized = sanitizeUuidFields(updates);

      const { data, error } = await supabase
        .from("service_calls")
        .update(sanitized)
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
    totalCount,
    createServiceCall: createMutation.mutate,
    createServiceCallAsync: createMutation.mutateAsync,
    updateServiceCall: updateMutation.mutate,
    updateServiceCallAsync: updateMutation.mutateAsync,
    deleteServiceCall: deleteMutation.mutate,
  };
};

/**
 * Hook para marcar um chamado como visto pelo técnico.
 * Atualiza seen_by_tech_at para now() se ainda estiver NULL.
 */
export const useMarkServiceCallSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from("service_calls")
        .update({ seen_by_tech_at: new Date().toISOString() })
        .eq("id", callId)
        .is("seen_by_tech_at", null); // Só atualiza se ainda não foi visto

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-service-calls-count"] });
      queryClient.invalidateQueries({ queryKey: ["service-calls"] });
    },
    onError: (error) => {
      // Fail silently - não bloqueia a UI
      console.error("Erro ao marcar chamado como visto:", error);
    },
  });
};
