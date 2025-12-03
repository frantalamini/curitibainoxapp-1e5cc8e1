import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardCounts {
  clientsCount: number;
  equipmentCount: number;
  activeTechniciansCount: number;
}

export const useDashboardCounts = () => {
  return useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async (): Promise<DashboardCounts> => {
      // Execute count queries in parallel for better performance
      const [clientsResult, equipmentResult, techniciansResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("equipment")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("technicians")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (equipmentResult.error) throw equipmentResult.error;
      if (techniciansResult.error) throw techniciansResult.error;

      return {
        clientsCount: clientsResult.count || 0,
        equipmentCount: equipmentResult.count || 0,
        activeTechniciansCount: techniciansResult.count || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - contagens não mudam frequentemente
    gcTime: 10 * 60 * 1000,   // 10 minutos no cache
  });
};

// Hook para buscar apenas os últimos 5 registros para preview
export const useRecentClients = () => {
  return useQuery({
    queryKey: ["recent-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, phone")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useRecentEquipment = () => {
  return useQuery({
    queryKey: ["recent-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, brand, model, serial_number, imei")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
