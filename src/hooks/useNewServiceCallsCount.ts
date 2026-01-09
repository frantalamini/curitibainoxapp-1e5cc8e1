import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTechnician } from "./useCurrentTechnician";

/**
 * Hook para contar chamados novos (seen_by_tech_at IS NULL) do técnico logado.
 * Atualiza automaticamente a cada 30 segundos.
 */
export const useNewServiceCallsCount = () => {
  const { technicianId } = useCurrentTechnician();

  return useQuery({
    queryKey: ["new-service-calls-count", technicianId],
    queryFn: async () => {
      if (!technicianId) return 0;

      const { count, error } = await supabase
        .from("service_calls")
        .select("*", { count: "exact", head: true })
        .eq("technician_id", technicianId)
        .is("seen_by_tech_at", null);

      if (error) {
        console.error("Erro ao contar chamados novos:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!technicianId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 10000, // 10 segundos
  });
};
