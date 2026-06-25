import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FUEL_COST_PER_KM } from "@/lib/constants";
import { sumHours, type WorkSession } from "@/hooks/useWorkSessions";

// Client "destipado" para a tabela de sessões (ainda não nos types gerados).
const sb = supabase as unknown as { from: (table: string) => any };

interface ServiceCallProfitability {
  id: string;
  osNumber: number;
  clientName: string;
  technicianName: string;
  scheduledDate: string;
  status: string;
  // Revenue
  totalProducts: number;
  totalServices: number;
  totalRevenue: number;
  // Costs
  productCosts: number;
  reimbursements: number;
  tripCosts: number;
  laborHours: number;
  laborCost: number;
  totalCosts: number;
  // Profit
  grossProfit: number;
  profitMargin: number;
}

interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  averageMargin: number;
  osCount: number;
}

export const useOSProfitability = (startDate: string, endDate: string) => {
  // Fetch service calls with related data
  const { data: serviceCalls = [], isLoading: callsLoading } = useQuery({
    queryKey: ["os-profitability-calls", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_calls")
        .select(
          `
          id,
          os_number,
          scheduled_date,
          status,
          technician_id,
          client:clients(full_name),
          technician:technicians(full_name, cost_per_hour, collaborator:collaborators(cost_per_hour))
        `,
        )
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch service call items (products and services)
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["os-profitability-items", startDate, endDate],
    queryFn: async () => {
      if (serviceCalls.length === 0) return [];

      const osIds = serviceCalls.map((sc) => sc.id);
      const { data, error } = await supabase
        .from("service_call_items")
        .select("service_call_id, type, total, qty, unit_price, product_id")
        .in("service_call_id", osIds);

      if (error) throw error;
      return data;
    },
    enabled: serviceCalls.length > 0,
  });

  // Fetch reimbursements
  const { data: reimbursements = [], isLoading: reimbursementsLoading } =
    useQuery({
      queryKey: ["os-profitability-reimbursements", startDate, endDate],
      queryFn: async () => {
        if (serviceCalls.length === 0) return [];

        const osIds = serviceCalls.map((sc) => sc.id);
        const { data, error } = await supabase
          .from("technician_reimbursements")
          .select("service_call_id, amount, status")
          .in("service_call_id", osIds)
          .in("status", ["APPROVED", "PAID"]);

        if (error) throw error;
        return data;
      },
      enabled: serviceCalls.length > 0,
    });

  // Fetch trips (for fuel cost estimation)
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["os-profitability-trips", startDate, endDate],
    queryFn: async () => {
      if (serviceCalls.length === 0) return [];

      const osIds = serviceCalls.map((sc) => sc.id);
      const { data, error } = await supabase
        .from("service_call_trips")
        .select("service_call_id, distance_km")
        .in("service_call_id", osIds)
        .eq("status", "concluido");

      if (error) throw error;
      return data;
    },
    enabled: serviceCalls.length > 0,
  });

  // Fetch work sessions (for labor cost = hours worked × technician hourly cost)
  const { data: workSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["os-profitability-work-sessions", startDate, endDate],
    queryFn: async () => {
      if (serviceCalls.length === 0) return [];

      const osIds = serviceCalls.map((sc) => sc.id);
      const { data, error } = await sb
        .from("service_call_work_sessions")
        .select(
          "service_call_id, technician_id, session_type, started_at, ended_at",
        )
        .in("service_call_id", osIds);

      if (error) throw error;
      return (data ?? []) as WorkSession[];
    },
    enabled: serviceCalls.length > 0,
  });

  // Fetch product costs (for margin calculation)
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["os-profitability-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, cost_price, sale_price");

      if (error) throw error;
      return data;
    },
  });

  const isLoading =
    callsLoading ||
    itemsLoading ||
    reimbursementsLoading ||
    tripsLoading ||
    sessionsLoading ||
    productsLoading;

  // Mapa product_id -> cost_price para lookup O(1)
  const productCostMap = new Map<string, number>(
    products.map((p) => [p.id, p.cost_price ?? 0]),
  );

  const osProfitability: ServiceCallProfitability[] = serviceCalls.map((sc) => {
    const osItems = items.filter((i) => i.service_call_id === sc.id);
    const osReimbursements = reimbursements.filter(
      (r) => r.service_call_id === sc.id,
    );
    const osTrips = trips.filter((t) => t.service_call_id === sc.id);
    const osSessions = workSessions.filter((s) => s.service_call_id === sc.id);

    // Técnico responsável (objeto ou array, dependendo do join)
    const tech = Array.isArray(sc.technician)
      ? sc.technician[0]
      : sc.technician;
    const technicianName = tech?.full_name ?? "N/A";
    // Custo/hora vem do colaborador vinculado (fallback: campo antigo do técnico).
    const collab = Array.isArray(tech?.collaborator)
      ? tech?.collaborator[0]
      : tech?.collaborator;
    const costPerHour = collab?.cost_per_hour ?? tech?.cost_per_hour ?? 0;

    // Revenue
    const totalProducts = osItems
      .filter((i) => i.type === "PRODUCT")
      .reduce((sum, i) => sum + i.total, 0);

    const totalServices = osItems
      .filter((i) => i.type === "SERVICE")
      .reduce((sum, i) => sum + i.total, 0);

    const totalRevenue = totalProducts + totalServices;

    // Costs
    // Product costs: usa cost_price real do produto; fallback 60% se não cadastrado
    const productCosts = osItems
      .filter((i) => i.type === "PRODUCT")
      .reduce((sum, i) => {
        const costPrice = i.product_id
          ? productCostMap.get(i.product_id)
          : undefined;
        if (costPrice !== undefined && costPrice > 0 && i.qty) {
          return sum + costPrice * i.qty;
        }
        // Fallback: estima 60% do total quando cost_price não está disponível
        return sum + i.total * 0.6;
      }, 0);

    const reimbursementsCost = osReimbursements.reduce(
      (sum, r) => sum + r.amount,
      0,
    );

    const totalKm = osTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const tripCosts = totalKm * FUEL_COST_PER_KM;

    // Mão de obra: horas das sessões de "trabalho" × custo/hora do técnico.
    // Se o técnico não tiver custo/hora cadastrado, fica 0 (não inventamos valor).
    const laborHours = sumHours(osSessions, "trabalho");
    const laborCost = laborHours * costPerHour;

    const totalCosts =
      productCosts + reimbursementsCost + tripCosts + laborCost;

    // Profit
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      id: sc.id,
      osNumber: sc.os_number,
      clientName: Array.isArray(sc.client)
        ? (sc.client[0]?.full_name ?? "N/A")
        : ((sc.client as { full_name?: string } | null)?.full_name ?? "N/A"),
      technicianName,
      scheduledDate: sc.scheduled_date,
      status: sc.status,
      totalProducts,
      totalServices,
      totalRevenue,
      productCosts,
      reimbursements: reimbursementsCost,
      tripCosts,
      laborHours,
      laborCost,
      totalCosts,
      grossProfit,
      profitMargin,
    };
  });

  // Summary
  const summary: ProfitabilitySummary = {
    totalRevenue: osProfitability.reduce((sum, os) => sum + os.totalRevenue, 0),
    totalCosts: osProfitability.reduce((sum, os) => sum + os.totalCosts, 0),
    totalProfit: osProfitability.reduce((sum, os) => sum + os.grossProfit, 0),
    averageMargin:
      osProfitability.length > 0
        ? osProfitability.reduce((sum, os) => sum + os.profitMargin, 0) /
          osProfitability.length
        : 0,
    osCount: osProfitability.length,
  };

  // Sort by profit (most profitable first)
  const sortedByProfit = [...osProfitability].sort(
    (a, b) => b.grossProfit - a.grossProfit,
  );
  const topProfitable = sortedByProfit.slice(0, 10);
  const leastProfitable = sortedByProfit.slice(-10).reverse();

  return {
    isLoading,
    osProfitability,
    summary,
    topProfitable,
    leastProfitable,
  };
};

export type { ServiceCallProfitability };
