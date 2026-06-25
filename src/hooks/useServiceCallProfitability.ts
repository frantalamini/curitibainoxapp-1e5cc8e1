import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FUEL_COST_PER_KM } from "@/lib/constants";
import { sumHours, type WorkSession } from "@/hooks/useWorkSessions";

const sb = supabase as unknown as { from: (table: string) => any };

export interface ServiceCallProfit {
  totalProducts: number;
  totalServices: number;
  totalRevenue: number;
  productCosts: number;
  reimbursements: number;
  tripCosts: number;
  laborHours: number;
  laborCost: number;
  costPerHour: number;
  hasTechnicianCost: boolean;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
}

// Lucro de UM chamado (peças + deslocamento + mão de obra). Uso interno.
export const useServiceCallProfitability = (serviceCallId?: string) => {
  return useQuery({
    queryKey: ["os-profitability", "single", serviceCallId],
    enabled: !!serviceCallId,
    queryFn: async (): Promise<ServiceCallProfit> => {
      const [callRes, itemsRes, reimbRes, tripsRes, sessionsRes] =
        await Promise.all([
          supabase
            .from("service_calls")
            .select(
              "id, technician:technicians(cost_per_hour, collaborator:collaborators(cost_per_hour))",
            )
            .eq("id", serviceCallId)
            .single(),
          supabase
            .from("service_call_items")
            .select("type, total, qty, product_id")
            .eq("service_call_id", serviceCallId),
          supabase
            .from("technician_reimbursements")
            .select("amount, status")
            .eq("service_call_id", serviceCallId)
            .in("status", ["APPROVED", "PAID"]),
          supabase
            .from("service_call_trips")
            .select("distance_km")
            .eq("service_call_id", serviceCallId)
            .eq("status", "concluido"),
          sb
            .from("service_call_work_sessions")
            .select("service_call_id, session_type, started_at, ended_at")
            .eq("service_call_id", serviceCallId),
        ]);

      const call = callRes.data as any;
      const items = (itemsRes.data ?? []) as any[];
      const reimbursementsData = (reimbRes.data ?? []) as any[];
      const trips = (tripsRes.data ?? []) as any[];
      const sessions = (sessionsRes.data ?? []) as WorkSession[];

      // Custo dos produtos (cost_price real ou fallback 60%)
      const productIds = items
        .filter((i) => i.type === "PRODUCT" && i.product_id)
        .map((i) => i.product_id);
      let costMap = new Map<string, number>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, cost_price")
          .in("id", productIds);
        costMap = new Map(
          (products ?? []).map((p) => [p.id, p.cost_price ?? 0]),
        );
      }

      const totalProducts = items
        .filter((i) => i.type === "PRODUCT")
        .reduce((s, i) => s + i.total, 0);
      const totalServices = items
        .filter((i) => i.type === "SERVICE")
        .reduce((s, i) => s + i.total, 0);
      const totalRevenue = totalProducts + totalServices;

      const productCosts = items
        .filter((i) => i.type === "PRODUCT")
        .reduce((s, i) => {
          const cp = i.product_id ? costMap.get(i.product_id) : undefined;
          if (cp !== undefined && cp > 0 && i.qty) return s + cp * i.qty;
          return s + i.total * 0.6;
        }, 0);

      const reimbursements = reimbursementsData.reduce(
        (s, r) => s + r.amount,
        0,
      );

      const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0);
      const tripCosts = totalKm * FUEL_COST_PER_KM;

      const tech = Array.isArray(call?.technician)
        ? call.technician[0]
        : call?.technician;
      const collab = Array.isArray(tech?.collaborator)
        ? tech?.collaborator[0]
        : tech?.collaborator;
      const costPerHour = collab?.cost_per_hour ?? tech?.cost_per_hour ?? 0;
      const hasTechnicianCost = costPerHour > 0;

      const laborHours = sumHours(sessions, "trabalho");
      const laborCost = laborHours * costPerHour;

      const totalCosts = productCosts + reimbursements + tripCosts + laborCost;
      const grossProfit = totalRevenue - totalCosts;
      const profitMargin =
        totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return {
        totalProducts,
        totalServices,
        totalRevenue,
        productCosts,
        reimbursements,
        tripCosts,
        laborHours,
        laborCost,
        costPerHour,
        hasTechnicianCost,
        totalCosts,
        grossProfit,
        profitMargin,
      };
    },
  });
};
