import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePurchaseApprovals() {
  const pendingRequests = useQuery({
    queryKey: ["purchase-approvals-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(
          `*, clients (id, full_name), cost_centers (id, name),
           requested_profile:profiles!purchase_requests_requested_by_fkey_profiles (user_id, full_name),
           purchase_request_items (id, description, qty, unit, estimated_unit_cost)`,
        )
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const draftOrders = useQuery({
    queryKey: ["purchase-approvals-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `*, supplier:clients!purchase_orders_supplier_id_fkey (id, full_name),
           cost_centers (id, name),
           purchase_order_items (id, description, qty, unit, unit_cost, total)`,
        )
        .eq("status", "DRAFT")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return {
    pendingRequests: pendingRequests.data || [],
    draftOrders: draftOrders.data || [],
    isLoading: pendingRequests.isLoading || draftOrders.isLoading,
    totalPending:
      (pendingRequests.data?.length || 0) + (draftOrders.data?.length || 0),
  };
}
