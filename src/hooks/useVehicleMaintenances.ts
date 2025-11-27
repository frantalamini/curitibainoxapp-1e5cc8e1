import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Vehicle } from "./useVehicles";

export type MaintenanceType = 'preventiva' | 'corretiva' | 'colisao';

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  vehicles?: Vehicle;
}

export interface VehicleMaintenanceInsert {
  vehicle_id: string;
  maintenance_type: MaintenanceType;
  started_at: string;
  finished_at?: string | null;
}

export interface VehicleMaintenanceFilters {
  vehicle_id?: string;
  maintenance_type?: MaintenanceType;
  date_from?: string;
  date_to?: string;
}

export const useVehicleMaintenances = (filters?: VehicleMaintenanceFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ["vehicle-maintenances", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_maintenances")
        .select("*, vehicles(*)")
        .order("started_at", { ascending: false });

      if (filters?.vehicle_id) {
        query = query.eq("vehicle_id", filters.vehicle_id);
      }

      if (filters?.maintenance_type) {
        query = query.eq("maintenance_type", filters.maintenance_type);
      }

      if (filters?.date_from) {
        query = query.gte("started_at", filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte("started_at", filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VehicleMaintenance[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VehicleMaintenanceInsert) => {
      const { error } = await supabase
        .from("vehicle_maintenances")
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenances"] });
      toast({
        title: "Sucesso",
        description: "Manutenção registrada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao registrar manutenção",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<VehicleMaintenance> & { id: string }) => {
      const { error } = await supabase
        .from("vehicle_maintenances")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenances"] });
      toast({
        title: "Sucesso",
        description: "Manutenção atualizada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar manutenção",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const getOpenMaintenance = async (vehicleId: string) => {
    const { data, error } = await supabase
      .from("vehicle_maintenances")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .is("finished_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as VehicleMaintenance | null;
  };

  return {
    maintenances,
    isLoading,
    createMaintenance: createMutation.mutate,
    updateMaintenance: updateMutation.mutate,
    getOpenMaintenance,
  };
};
