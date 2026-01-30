import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCostCenters } from "./useCostCenters";

interface CostCenterTransaction {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string | null;
  direction: string;
  cost_center_id: string | null;
  category_id: string | null;
  category?: { name: string } | null;
}

interface CostCenterSummary {
  id: string;
  name: string;
  totalExpenses: number;
  totalPaid: number;
  totalOpen: number;
  transactionCount: number;
  percentOfTotal: number;
}

export const useCostCenterReport = (year: number, month?: number) => {
  const { costCenters } = useCostCenters();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cost-center-report", year, month],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          id,
          description,
          amount,
          due_date,
          paid_at,
          status,
          direction,
          cost_center_id,
          category_id,
          category:financial_categories(name)
        `)
        .eq("direction", "PAY");

      // Filter by year
      const startDate = month
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : `${year}-01-01`;
      const endDate = month
        ? `${year}-${String(month).padStart(2, "0")}-31`
        : `${year}-12-31`;

      query = query.gte("due_date", startDate).lte("due_date", endDate);

      const { data, error } = await query.order("due_date", { ascending: false });

      if (error) throw error;
      return data as CostCenterTransaction[];
    },
  });

  // Calculate summary by cost center
  const costCenterSummaries: CostCenterSummary[] = costCenters.map((cc) => {
    const ccTransactions = transactions.filter((t) => t.cost_center_id === cc.id);
    const totalExpenses = ccTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = ccTransactions
      .filter((t) => t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOpen = ccTransactions
      .filter((t) => t.status === "OPEN")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: cc.id,
      name: cc.name,
      totalExpenses,
      totalPaid,
      totalOpen,
      transactionCount: ccTransactions.length,
      percentOfTotal: 0, // Will be calculated after
    };
  });

  // Add "Sem Centro de Custo" for transactions without cost_center_id
  const unassignedTransactions = transactions.filter((t) => !t.cost_center_id);
  if (unassignedTransactions.length > 0) {
    const totalExpenses = unassignedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = unassignedTransactions
      .filter((t) => t.status === "PAID")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOpen = unassignedTransactions
      .filter((t) => t.status === "OPEN")
      .reduce((sum, t) => sum + t.amount, 0);

    costCenterSummaries.push({
      id: "unassigned",
      name: "Sem Centro de Custo",
      totalExpenses,
      totalPaid,
      totalOpen,
      transactionCount: unassignedTransactions.length,
      percentOfTotal: 0,
    });
  }

  // Calculate percentages
  const grandTotal = costCenterSummaries.reduce((sum, cc) => sum + cc.totalExpenses, 0);
  costCenterSummaries.forEach((cc) => {
    cc.percentOfTotal = grandTotal > 0 ? (cc.totalExpenses / grandTotal) * 100 : 0;
  });

  // Sort by total expenses descending
  costCenterSummaries.sort((a, b) => b.totalExpenses - a.totalExpenses);

  // Get transactions for a specific cost center
  const getTransactionsByCostCenter = (costCenterId: string) => {
    if (costCenterId === "unassigned") {
      return transactions.filter((t) => !t.cost_center_id);
    }
    return transactions.filter((t) => t.cost_center_id === costCenterId);
  };

  return {
    transactions,
    costCenterSummaries,
    grandTotal,
    isLoading,
    getTransactionsByCostCenter,
  };
};
