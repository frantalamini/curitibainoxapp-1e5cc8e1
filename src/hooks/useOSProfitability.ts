import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
        .select(`
          id,
          os_number,
          scheduled_date,
          status,
          client:clients(full_name),
          technician:technicians(full_name)
        `)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return data;
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
        .select("service_call_id, type, total, qty, unit_price")
        .in("service_call_id", osIds);

      if (error) throw error;
      return data;
    },
    enabled: serviceCalls.length > 0,
  });

  // Fetch reimbursements
  const { data: reimbursements = [], isLoading: reimbursementsLoading } = useQuery({
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

  const isLoading = callsLoading || itemsLoading || reimbursementsLoading || tripsLoading || productsLoading;

  // Calculate profitability per OS
  const FUEL_COST_PER_KM = 1.2; // Estimativa R$ por km

  const osProfitability: ServiceCallProfitability[] = serviceCalls.map((sc) => {
    const osItems = items.filter((i) => i.service_call_id === sc.id);
    const osReimbursements = reimbursements.filter((r) => r.service_call_id === sc.id);
    const osTrips = trips.filter((t) => t.service_call_id === sc.id);

    // Revenue
    const totalProducts = osItems
      .filter((i) => i.type === "PRODUCT")
      .reduce((sum, i) => sum + i.total, 0);
    
    const totalServices = osItems
      .filter((i) => i.type === "SERVICE")
      .reduce((sum, i) => sum + i.total, 0);
    
    const totalRevenue = totalProducts + totalServices;

    // Costs
    // Product costs: estimate based on cost_price if available
    const productCosts = osItems
      .filter((i) => i.type === "PRODUCT")
      .reduce((sum, i) => {
        // Estimate cost as 60% of sale price if no cost data
        return sum + (i.total * 0.6);
      }, 0);

    const reimbursementsCost = osReimbursements.reduce((sum, r) => sum + r.amount, 0);
    
    const totalKm = osTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const tripCosts = totalKm * FUEL_COST_PER_KM;

    const totalCosts = productCosts + reimbursementsCost + tripCosts;

    // Profit
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      id: sc.id,
      osNumber: sc.os_number,
      clientName: (sc.client as any)?.full_name || "N/A",
      technicianName: (sc.technician as any)?.full_name || "N/A",
      scheduledDate: sc.scheduled_date,
      status: sc.status,
      totalProducts,
      totalServices,
      totalRevenue,
      productCosts,
      reimbursements: reimbursementsCost,
      tripCosts,
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
    averageMargin: osProfitability.length > 0
      ? osProfitability.reduce((sum, os) => sum + os.profitMargin, 0) / osProfitability.length
      : 0,
    osCount: osProfitability.length,
  };

  // Sort by profit (most profitable first)
  const sortedByProfit = [...osProfitability].sort((a, b) => b.grossProfit - a.grossProfit);
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
