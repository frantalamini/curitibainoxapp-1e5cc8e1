import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePurchaseDashboard(period: { from: string; to: string }) {
  const orders = useQuery({
    queryKey: ["purchase-dashboard-orders", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `id, order_number, status, total, supplier_id, created_at, approved_at, sent_at,
           supplier:clients!purchase_orders_supplier_id_fkey (id, full_name),
           purchase_order_items (id, description, qty, unit_cost, total, product_id)`,
        )
        .gte("created_at", period.from)
        .lte("created_at", period.to + "T23:59:59")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const requests = useQuery({
    queryKey: ["purchase-dashboard-requests", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("id, status, priority, created_at, approved_at")
        .gte("created_at", period.from)
        .lte("created_at", period.to + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
  });

  const receipts = useQuery({
    queryKey: ["purchase-dashboard-receipts", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_receipts")
        .select("id, status, has_divergence, order_id, created_at")
        .gte("created_at", period.from)
        .lte("created_at", period.to + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
  });

  const quotations = useQuery({
    queryKey: ["purchase-dashboard-quotations", period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_quotations")
        .select("id, status, total, request_id, supplier_id, created_at")
        .gte("created_at", period.from)
        .lte("created_at", period.to + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
  });

  const allOrders = orders.data || [];
  const allRequests = requests.data || [];
  const allReceipts = receipts.data || [];
  const allQuotations = quotations.data || [];

  // KPIs
  const totalComprado = allOrders
    .filter((o) => !["CANCELLED"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0);

  const pedidosPendentes = allOrders.filter(
    (o) => !["RECEIVED", "CANCELLED"].includes(o.status),
  ).length;

  const pedidosRecebidos = allOrders.filter(
    (o) => o.status === "RECEIVED",
  ).length;

  const divergencias = allReceipts.filter((r) => r.has_divergence).length;

  // Tempo médio de aprovação (solicitações)
  const approvedWithTime = allRequests.filter(
    (r) => r.status === "APPROVED" && r.approved_at && r.created_at,
  );
  const avgApprovalHours =
    approvedWithTime.length > 0
      ? approvedWithTime.reduce((sum, r) => {
          const diff =
            new Date(r.approved_at!).getTime() -
            new Date(r.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0) / approvedWithTime.length
      : 0;

  // Ranking fornecedores por volume
  const supplierMap = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  allOrders
    .filter((o) => !["CANCELLED"].includes(o.status))
    .forEach((o) => {
      const sid = o.supplier_id;
      const name = (o.supplier as any)?.full_name || "—";
      const existing = supplierMap.get(sid) || { name, total: 0, count: 0 };
      existing.total += Number(o.total);
      existing.count += 1;
      supplierMap.set(sid, existing);
    });
  const topSuppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Itens mais comprados
  const itemMap = new Map<
    string,
    { description: string; qty: number; total: number }
  >();
  allOrders
    .filter((o) => !["CANCELLED"].includes(o.status))
    .forEach((o) => {
      (o.purchase_order_items || []).forEach((item: any) => {
        const key = item.product_id || item.description;
        const existing = itemMap.get(key) || {
          description: item.description,
          qty: 0,
          total: 0,
        };
        existing.qty += Number(item.qty);
        existing.total += Number(item.total);
        itemMap.set(key, existing);
      });
    });
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Economia via cotação
  const requestsWithQuotations = new Map<string, number[]>();
  allQuotations
    .filter((q) => q.request_id && q.status !== "EXPIRED")
    .forEach((q) => {
      const existing = requestsWithQuotations.get(q.request_id!) || [];
      existing.push(Number(q.total));
      requestsWithQuotations.set(q.request_id!, existing);
    });
  let totalSavings = 0;
  requestsWithQuotations.forEach((totals) => {
    if (totals.length >= 2) {
      const max = Math.max(...totals);
      const min = Math.min(...totals);
      totalSavings += max - min;
    }
  });

  // Status das solicitações
  const requestsByStatus = {
    DRAFT: allRequests.filter((r) => r.status === "DRAFT").length,
    PENDING: allRequests.filter((r) => r.status === "PENDING").length,
    APPROVED: allRequests.filter((r) => r.status === "APPROVED").length,
    REJECTED: allRequests.filter((r) => r.status === "REJECTED").length,
    ORDERED: allRequests.filter((r) => r.status === "ORDERED").length,
  };

  return {
    isLoading:
      orders.isLoading ||
      requests.isLoading ||
      receipts.isLoading ||
      quotations.isLoading,
    totalComprado,
    pedidosPendentes,
    pedidosRecebidos,
    divergencias,
    avgApprovalHours,
    topSuppliers,
    topItems,
    totalSavings,
    requestsByStatus,
    totalRequests: allRequests.length,
    totalOrders: allOrders.length,
    totalQuotations: allQuotations.length,
  };
}
