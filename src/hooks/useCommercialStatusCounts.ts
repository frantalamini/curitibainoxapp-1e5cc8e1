import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CommercialStatusCount {
  commercial_status_id: string | null;
  count: number;
}

/**
 * Hook que busca a contagem de OS agrupada por commercial_status_id.
 * Retorna um Map<statusId | "all", count>.
 */
export const useCommercialStatusCounts = () => {
  return useQuery({
    queryKey: ["commercial-status-counts"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("AUTH_SESSION_NOT_READY");

      // Uma única query buscando só o campo commercial_status_id
      const { data, error } = await supabase
        .from("service_calls")
        .select("commercial_status_id");

      if (error) throw error;

      // Contagem em memória — O(n) sobre o array, sem queries extras
      const counts: Record<string, number> = { all: data?.length || 0 };
      (data || []).forEach((sc) => {
        const id = sc.commercial_status_id;
        if (id) counts[id] = (counts[id] || 0) + 1;
      });

      return counts;
    },
    staleTime: 3 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        error.message === "AUTH_SESSION_NOT_READY"
      ) {
        return failureCount < 5;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(250 * (attemptIndex + 1), 1500),
  });
};
