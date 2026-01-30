import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TechnicianCostSummary {
  id: string;
  name: string;
  reimbursementsTotal: number;
  reimbursementsCount: number;
  tripsTotal: number;
  tripsCount: number;
  totalKm: number;
  fuelCostEstimate: number;
  totalCost: number;
  serviceCallsCount: number;
  costPerServiceCall: number;
}

const FUEL_COST_PER_KM = 1.2; // R$ 1.20 por km (estimativa)

export const useTechnicianCostsReport = (year: number, month?: number) => {
  const { data, isLoading } = useQuery({
    queryKey: ["technician-costs-report", year, month],
    queryFn: async () => {
      // Build date range
      const startDate = month
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : `${year}-01-01`;
      const endDate = month
        ? `${year}-${String(month).padStart(2, "0")}-31`
        : `${year}-12-31`;

      // Fetch technicians
      const { data: technicians, error: techError } = await supabase
        .from("technicians")
        .select("id, full_name")
        .eq("active", true);

      if (techError) throw techError;

      // Fetch reimbursements
      const { data: reimbursements, error: reimbError } = await supabase
        .from("technician_reimbursements")
        .select("technician_id, amount, status")
        .gte("requested_at", startDate)
        .lte("requested_at", endDate + "T23:59:59");

      if (reimbError) throw reimbError;

      // Fetch trips
      const { data: trips, error: tripsError } = await supabase
        .from("service_call_trips")
        .select("technician_id, distance_km, status")
        .gte("started_at", startDate)
        .lte("started_at", endDate + "T23:59:59");

      if (tripsError) throw tripsError;

      // Fetch service calls count by technician
      const { data: serviceCalls, error: scError } = await supabase
        .from("service_calls")
        .select("technician_id")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate);

      if (scError) throw scError;

      // Calculate costs per technician
      const summaries: TechnicianCostSummary[] = technicians.map((tech) => {
        // Reimbursements (approved only)
        const techReimbursements = reimbursements.filter(
          (r) => r.technician_id === tech.id && r.status === "APPROVED"
        );
        const reimbursementsTotal = techReimbursements.reduce(
          (sum, r) => sum + r.amount,
          0
        );

        // Trips
        const techTrips = trips.filter(
          (t) => t.technician_id === tech.id && t.status === "concluido"
        );
        const totalKm = techTrips.reduce(
          (sum, t) => sum + (t.distance_km || 0),
          0
        );
        const fuelCostEstimate = totalKm * FUEL_COST_PER_KM;

        // Service calls
        const techServiceCalls = serviceCalls.filter(
          (sc) => sc.technician_id === tech.id
        );

        const totalCost = reimbursementsTotal + fuelCostEstimate;
        const costPerServiceCall =
          techServiceCalls.length > 0 ? totalCost / techServiceCalls.length : 0;

        return {
          id: tech.id,
          name: tech.full_name,
          reimbursementsTotal,
          reimbursementsCount: techReimbursements.length,
          tripsTotal: fuelCostEstimate,
          tripsCount: techTrips.length,
          totalKm,
          fuelCostEstimate,
          totalCost,
          serviceCallsCount: techServiceCalls.length,
          costPerServiceCall,
        };
      });

      // Sort by total cost descending
      summaries.sort((a, b) => b.totalCost - a.totalCost);

      // Calculate totals
      const grandTotal = summaries.reduce((sum, s) => sum + s.totalCost, 0);
      const totalReimbursements = summaries.reduce(
        (sum, s) => sum + s.reimbursementsTotal,
        0
      );
      const totalFuel = summaries.reduce((sum, s) => sum + s.fuelCostEstimate, 0);
      const totalKm = summaries.reduce((sum, s) => sum + s.totalKm, 0);

      return {
        summaries,
        grandTotal,
        totalReimbursements,
        totalFuel,
        totalKm,
      };
    },
  });

  return {
    summaries: data?.summaries || [],
    grandTotal: data?.grandTotal || 0,
    totalReimbursements: data?.totalReimbursements || 0,
    totalFuel: data?.totalFuel || 0,
    totalKm: data?.totalKm || 0,
    isLoading,
  };
};
