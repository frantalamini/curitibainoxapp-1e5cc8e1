import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VehicleCostSummary {
  id: string;
  name: string;
  plate: string;
  tripsCount: number;
  totalKm: number;
  fuelCostEstimate: number;
  maintenanceCount: number;
  totalCost: number;
  costPerKm: number;
}

const FUEL_COST_PER_KM = 1.2; // R$ 1.20 por km

export const useVehicleCostsReport = (year: number, month?: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-costs-report", year, month],
    queryFn: async () => {
      const startDate = month
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : `${year}-01-01`;
      const endDate = month
        ? `${year}-${String(month).padStart(2, "0")}-31`
        : `${year}-12-31`;

      // Fetch vehicles
      const { data: vehicles, error: vehError } = await supabase
        .from("vehicles")
        .select("id, name, plate")
        .eq("active", true);

      if (vehError) throw vehError;

      // Fetch trips
      const { data: trips, error: tripsError } = await supabase
        .from("service_call_trips")
        .select("vehicle_id, distance_km, status")
        .gte("started_at", startDate)
        .lte("started_at", endDate + "T23:59:59");

      if (tripsError) throw tripsError;

      // Fetch maintenances
      const { data: maintenances, error: maintError } = await supabase
        .from("vehicle_maintenances")
        .select("vehicle_id, maintenance_type")
        .gte("started_at", startDate)
        .lte("started_at", endDate + "T23:59:59");

      if (maintError) throw maintError;

      // Calculate costs per vehicle
      const summaries: VehicleCostSummary[] = vehicles.map((veh) => {
        // Trips (completed only)
        const vehTrips = trips.filter(
          (t) => t.vehicle_id === veh.id && t.status === "concluido"
        );
        const totalKm = vehTrips.reduce(
          (sum, t) => sum + (t.distance_km || 0),
          0
        );
        const fuelCostEstimate = totalKm * FUEL_COST_PER_KM;

        // Maintenances
        const vehMaintenances = maintenances.filter(
          (m) => m.vehicle_id === veh.id
        );

        const totalCost = fuelCostEstimate;
        const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;

        return {
          id: veh.id,
          name: veh.name,
          plate: veh.plate,
          tripsCount: vehTrips.length,
          totalKm,
          fuelCostEstimate,
          maintenanceCount: vehMaintenances.length,
          totalCost,
          costPerKm,
        };
      });

      // Sort by total km descending
      summaries.sort((a, b) => b.totalKm - a.totalKm);

      // Calculate totals
      const grandTotal = summaries.reduce((sum, s) => sum + s.totalCost, 0);
      const totalKm = summaries.reduce((sum, s) => sum + s.totalKm, 0);
      const totalTrips = summaries.reduce((sum, s) => sum + s.tripsCount, 0);
      const totalMaintenances = summaries.reduce(
        (sum, s) => sum + s.maintenanceCount,
        0
      );

      return {
        summaries,
        grandTotal,
        totalKm,
        totalTrips,
        totalMaintenances,
      };
    },
  });

  return {
    summaries: data?.summaries || [],
    grandTotal: data?.grandTotal || 0,
    totalKm: data?.totalKm || 0,
    totalTrips: data?.totalTrips || 0,
    totalMaintenances: data?.totalMaintenances || 0,
    isLoading,
  };
};
