import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCallMarker {
  id: string;
  service_call_id: string;
  text: string;
  created_at: string;
  created_by: string;
}

export function useServiceCallMarkers(serviceCallIds?: string[]) {
  const queryClient = useQueryClient();

  // Busca marcadores para uma lista de OS (usado na listagem)
  const { data: markers = [], isLoading } = useQuery({
    queryKey: ["service-call-markers", serviceCallIds],
    queryFn: async () => {
      if (!serviceCallIds || serviceCallIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("service_call_markers")
        .select("*")
        .in("service_call_id", serviceCallIds)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as ServiceCallMarker[];
    },
    enabled: !!serviceCallIds && serviceCallIds.length > 0,
  });

  // Agrupa marcadores por service_call_id
  const markersByServiceCall = markers.reduce((acc, marker) => {
    if (!acc[marker.service_call_id]) {
      acc[marker.service_call_id] = [];
    }
    acc[marker.service_call_id].push(marker);
    return acc;
  }, {} as Record<string, ServiceCallMarker[]>);

  // Adicionar marcador
  const addMarker = useMutation({
    mutationFn: async ({ serviceCallId, text }: { serviceCallId: string; text: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("service_call_markers")
        .insert({
          service_call_id: serviceCallId,
          text: text.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-markers"] });
    },
  });

  // Remover marcador
  const removeMarker = useMutation({
    mutationFn: async (markerId: string) => {
      const { error } = await supabase
        .from("service_call_markers")
        .delete()
        .eq("id", markerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-markers"] });
    },
  });

  return {
    markers,
    markersByServiceCall,
    isLoading,
    addMarker,
    removeMarker,
  };
}

// Hook simplificado para uma única OS
export function useSingleServiceCallMarkers(serviceCallId: string) {
  return useServiceCallMarkers(serviceCallId ? [serviceCallId] : undefined);
}
