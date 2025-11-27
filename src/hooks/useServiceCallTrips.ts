import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TripStatus = 'em_deslocamento' | 'concluido';

export interface ServiceCallTrip {
  id: string;
  service_call_id: string;
  technician_id: string;
  vehicle_id: string;
  started_at: string;
  finished_at: string | null;
  start_odometer_km: number;
  end_odometer_km: number | null;
  distance_km: number | null;
  status: TripStatus;
  created_at: string;
  vehicles?: { 
    name: string; 
    plate: string; 
    brand: string | null;
  };
  technicians?: { 
    full_name: string;
  };
  service_calls?: { 
    os_number: number;
    clients?: { 
      full_name: string;
    };
  };
}

export interface ServiceCallTripInsert {
  service_call_id: string;
  technician_id: string;
  vehicle_id: string;
  start_odometer_km: number;
  started_at?: string;
  status?: TripStatus;
}

export interface ServiceCallTripUpdate {
  finished_at?: string;
  end_odometer_km?: number;
  distance_km?: number;
  status?: TripStatus;
}

// Hook para buscar deslocamento em aberto por service_call_id
export const useOpenTrip = (serviceCallId?: string) => {
  return useQuery({
    queryKey: ["open-trip", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return null;
      
      const { data, error } = await supabase
        .from("service_call_trips")
        .select("*")
        .eq("service_call_id", serviceCallId)
        .eq("status", "em_deslocamento")
        .maybeSingle();

      if (error) throw error;
      return data as ServiceCallTrip | null;
    },
    enabled: !!serviceCallId,
  });
};

// Hook para verificar se existe deslocamento concluído
export const useHasCompletedTrip = (serviceCallId?: string) => {
  return useQuery({
    queryKey: ["completed-trip", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return false;
      
      const { data, error } = await supabase
        .from("service_call_trips")
        .select("id")
        .eq("service_call_id", serviceCallId)
        .eq("status", "concluido")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!serviceCallId,
  });
};

// Hook para listar todos os deslocamentos (para relatório)
export const useServiceCallTrips = (filters?: {
  startDate?: string;
  endDate?: string;
  vehicleId?: string;
  technicianId?: string;
}) => {
  return useQuery({
    queryKey: ["service-call-trips", filters],
    queryFn: async () => {
      let query = supabase
        .from("service_call_trips")
        .select(`
          *,
          vehicles (name, plate, brand),
          technicians (full_name),
          service_calls (
            os_number,
            clients (full_name)
          )
        `)
        .order("started_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("started_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("started_at", filters.endDate);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.technicianId) {
        query = query.eq("technician_id", filters.technicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceCallTrip[];
    },
  });
};

// Hook para criar/atualizar/deletar deslocamentos
export const useServiceCallTripsMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (trip: ServiceCallTripInsert) => {
      const { data, error } = await supabase
        .from("service_call_trips")
        .insert(trip)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-call-trips"] });
      queryClient.invalidateQueries({ queryKey: ["open-trip", data.service_call_id] });
      queryClient.invalidateQueries({ queryKey: ["completed-trip", data.service_call_id] });
      toast({
        title: "Deslocamento iniciado",
        description: "O deslocamento foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar deslocamento",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ServiceCallTripUpdate }) => {
      const { data, error } = await supabase
        .from("service_call_trips")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-call-trips"] });
      queryClient.invalidateQueries({ queryKey: ["open-trip", data.service_call_id] });
      queryClient.invalidateQueries({ queryKey: ["completed-trip", data.service_call_id] });
      toast({
        title: "Deslocamento atualizado",
        description: "O deslocamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar deslocamento",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_call_trips")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-trips"] });
      toast({
        title: "Deslocamento excluído",
        description: "O deslocamento foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir deslocamento",
        description: error.message,
      });
    },
  });

  return {
    createTrip: createMutation.mutate,
    updateTrip: updateMutation.mutate,
    deleteTrip: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
