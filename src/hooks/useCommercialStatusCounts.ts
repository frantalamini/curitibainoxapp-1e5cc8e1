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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("AUTH_SESSION_NOT_READY");

      // Total count
      const { count: totalCount, error: totalError } = await supabase
        .from("service_calls")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Count per commercial_status_id using RPC isn't available,
      // so we fetch all distinct commercial_status_ids and count each
      const { data: statuses, error: statusError } = await supabase
        .from("service_call_statuses")
        .select("id")
        .eq("status_type", "comercial")
        .eq("active", true);

      if (statusError) throw statusError;

      const counts: Record<string, number> = { all: totalCount || 0 };

      // Parallel count queries
      const countPromises = (statuses || []).map(async (s) => {
        const { count, error } = await supabase
          .from("service_calls")
          .select("*", { count: "exact", head: true })
          .eq("commercial_status_id", s.id);

        if (error) throw error;
        return { id: s.id, count: count || 0 };
      });

      const results = await Promise.all(countPromises);
      results.forEach((r) => {
        counts[r.id] = r.count;
      });

      return counts;
    },
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "AUTH_SESSION_NOT_READY") {
        return failureCount < 5;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(250 * (attemptIndex + 1), 1500),
  });
};
