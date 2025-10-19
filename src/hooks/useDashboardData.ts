import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardData = (startDate?: Date, endDate?: Date, technicianId?: string) => {
  return useQuery({
    queryKey: ["dashboard", startDate, endDate, technicianId],
    queryFn: async () => {
      let query = supabase
        .from("service_calls")
        .select(`
          *,
          clients (id, full_name),
          technicians (id, full_name),
          service_types (id, name, color)
        `);

      if (startDate) {
        query = query.gte("scheduled_date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        query = query.lte("scheduled_date", endDate.toISOString().split("T")[0]);
      }
      
      if (technicianId) {
        query = query.eq("technician_id", technicianId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const calls = data || [];
      const uniqueClients = new Set(calls.map((c: any) => c.client_id));
      const uniqueEquipment = new Set(calls.map((c: any) => c.equipment_description));
      const completedCalls = calls.filter((c: any) => c.status === "completed").length;
      
      return {
        calls,
        totalCalls: calls.length,
        totalClients: uniqueClients.size,
        totalEquipment: uniqueEquipment.size,
        completionRate: calls.length > 0 ? (completedCalls / calls.length) * 100 : 0,
      };
    },
  });
};
