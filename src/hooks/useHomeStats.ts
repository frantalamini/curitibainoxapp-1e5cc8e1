import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingCall {
  id: string;
  os_number: number;
  scheduled_date: string;
  scheduled_time: string;
  equipment_description: string;
  client_name: string;
  technician_name: string;
}

interface HomeStats {
  openCallsCount: number;
  overdueCallsCount: number;
  todayCallsCount: number;
  clientsCount: number;
  upcomingCalls: UpcomingCall[];
}

export const useHomeStats = () => {
  return useQuery({
    queryKey: ["home-stats"],
    queryFn: async (): Promise<HomeStats> => {
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

      // Queries em paralelo
      const [
        openCallsResult,
        overdueCallsResult,
        todayCallsResult,
        clientsResult,
        upcomingCallsResult,
      ] = await Promise.all([
        // Chamados em aberto (status não finalizado/cancelado)
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .in("status_id", openStatusIds),

        // Chamados em atraso (data < hoje AND status não finalizado)
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .lt("scheduled_date", today)
          .not("status_id", "in", `(${finishedStatusIds.join(",")})`),

        // Chamados do dia
        supabase
          .from("service_calls")
          .select("id", { count: "exact", head: true })
          .eq("scheduled_date", today),

        // Total de clientes
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true }),

        // Próximos compromissos (5 próximos a partir de hoje)
        supabase
          .from("service_calls")
          .select(`
            id,
            os_number,
            scheduled_date,
            scheduled_time,
            equipment_description,
            clients (full_name),
            technicians (full_name)
          `)
          .gte("scheduled_date", today)
          .not("status_id", "in", `(${finishedStatusIds.join(",")})`)
          .order("os_number", { ascending: false })
          .limit(5),
      ]);

      const upcomingCalls: UpcomingCall[] = (upcomingCallsResult.data || []).map((call: any) => ({
        id: call.id,
        os_number: call.os_number,
        scheduled_date: call.scheduled_date,
        scheduled_time: call.scheduled_time,
        equipment_description: call.equipment_description,
        client_name: call.clients?.full_name || "Cliente não informado",
        technician_name: call.technicians?.full_name || "Técnico não informado",
      }));

      return {
        openCallsCount: openCallsResult.count || 0,
        overdueCallsCount: overdueCallsResult.count || 0,
        todayCallsCount: todayCallsResult.count || 0,
        clientsCount: clientsResult.count || 0,
        upcomingCalls,
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
