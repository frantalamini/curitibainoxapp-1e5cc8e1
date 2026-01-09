import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTechnician } from "./useCurrentTechnician";

interface UpcomingCall {
  id: string;
  os_number: number;
  scheduled_date: string;
  scheduled_time: string;
  equipment_description: string;
  client_name: string;
}

interface TechnicianHomeStats {
  openCallsCount: number;
  overdueCallsCount: number;
  todayCallsCount: number;
  upcomingCalls: UpcomingCall[];
}

export const useTechnicianHomeStats = () => {
  const { technicianId, isLoading: isTechnicianLoading } = useCurrentTechnician();

  return useQuery({
    queryKey: ["technician-home-stats", technicianId],
    queryFn: async (): Promise<TechnicianHomeStats> => {
      if (!technicianId) {
        return {
          openCallsCount: 0,
          overdueCallsCount: 0,
          todayCallsCount: 0,
          upcomingCalls: [],
        };
      }

      const today = new Date().toISOString().split("T")[0];

      // Buscar status IDs para filtrar chamados em aberto
      const { data: statuses } = await supabase
        .from("service_call_statuses")
        .select("id, name")
        .eq("status_type", "tecnico")
        .eq("active", true);

      const finishedStatusNames = ["Finalizado", "Cancelado"];
      const openStatusIds = statuses
        ?.filter((s) => !finishedStatusNames.includes(s.name))
        .map((s) => s.id) || [];
      
      const finishedStatusIds = statuses
        ?.filter((s) => finishedStatusNames.includes(s.name))
        .map((s) => s.id) || [];

      // Queries em paralelo - filtradas por técnico
      const [
        openCallsResult,
        overdueCallsResult,
        todayCallsResult,
        upcomingCallsResult,
      ] = await Promise.all([
        // Chamados em aberto do técnico
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .in("status_id", openStatusIds),

        // Chamados em atraso do técnico
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .lt("scheduled_date", today)
          .not("status_id", "in", `(${finishedStatusIds.join(",")})`),

        // Chamados do dia do técnico
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .eq("technician_id", technicianId)
          .eq("scheduled_date", today),

        // Próximos compromissos do técnico (5 próximos)
        supabase
          .from("service_calls")
          .select(`
            id,
            os_number,
            scheduled_date,
            scheduled_time,
            equipment_description,
            clients (full_name)
          `)
          .eq("technician_id", technicianId)
          .gte("scheduled_date", today)
          .not("status_id", "in", `(${finishedStatusIds.join(",")})`)
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true })
          .limit(5),
      ]);

      const upcomingCalls: UpcomingCall[] = (upcomingCallsResult.data || []).map((call: any) => ({
        id: call.id,
        os_number: call.os_number,
        scheduled_date: call.scheduled_date,
        scheduled_time: call.scheduled_time,
        equipment_description: call.equipment_description,
        client_name: call.clients?.full_name || "Cliente não informado",
      }));

      return {
        openCallsCount: openCallsResult.count || 0,
        overdueCallsCount: overdueCallsResult.count || 0,
        todayCallsCount: todayCallsResult.count || 0,
        upcomingCalls,
      };
    },
    enabled: !isTechnicianLoading && !!technicianId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
