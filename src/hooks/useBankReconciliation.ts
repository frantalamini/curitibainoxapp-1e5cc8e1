import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialAccounts } from "./useFinancialAccounts";

interface AccountReconciliation {
  id: string;
  name: string;
  bankName: string | null;
  openingBalance: number;
  openingDate: string;
  totalReceived: number;
  totalPaid: number;
  calculatedBalance: number;
  transactionsCount: number;
}

interface ReconciliationTransaction {
  id: string;
  description: string | null;
  amount: number;
  direction: string;
  due_date: string;
  paid_at: string | null;
  status: string | null;
}

export const useBankReconciliation = (year: number, month?: number) => {
  const { accounts } = useFinancialAccounts();

  const { data, isLoading } = useQuery({
    queryKey: ["bank-reconciliation", year, month],
    queryFn: async () => {
      const startDate = month
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : `${year}-01-01`;
      const endDate = month
        ? `${year}-${String(month).padStart(2, "0")}-31`
        : `${year}-12-31`;

      // Fetch paid transactions with financial_account_id
      const { data: transactions, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, direction, due_date, paid_at, status, financial_account_id")
        .eq("status", "PAID")
        .not("financial_account_id", "is", null)
        .gte("paid_at", startDate)
        .lte("paid_at", endDate + "T23:59:59")
        .order("paid_at", { ascending: true });

      if (error) throw error;

      return transactions;
    },
    enabled: accounts.length > 0,
  });

  const transactions = data || [];

  // Calculate reconciliation per account
  const reconciliations: AccountReconciliation[] = accounts
    .filter((acc) => acc.is_active)
    .map((acc) => {
      const accTransactions = transactions.filter(
        (t) => t.financial_account_id === acc.id
      );

      const totalReceived = accTransactions
        .filter((t) => t.direction === "RECEIVE")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalPaid = accTransactions
        .filter((t) => t.direction === "PAY")
        .reduce((sum, t) => sum + t.amount, 0);

      const calculatedBalance = acc.opening_balance + totalReceived - totalPaid;

      return {
        id: acc.id,
        name: acc.name,
        bankName: acc.bank_name,
        openingBalance: acc.opening_balance,
        openingDate: acc.opening_balance_date,
        totalReceived,
        totalPaid,
        calculatedBalance,
        transactionsCount: accTransactions.length,
      };
    });

  // Get transactions for a specific account
  const getTransactionsByAccount = (accountId: string): ReconciliationTransaction[] => {
    return transactions
      .filter((t) => t.financial_account_id === accountId)
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        due_date: t.due_date,
        paid_at: t.paid_at,
        status: t.status,
      }));
  };

  // Calculate totals
  const totalOpeningBalance = reconciliations.reduce(
    (sum, r) => sum + r.openingBalance,
    0
  );
  const totalReceived = reconciliations.reduce(
    (sum, r) => sum + r.totalReceived,
    0
  );
  const totalPaid = reconciliations.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalCalculatedBalance = reconciliations.reduce(
    (sum, r) => sum + r.calculatedBalance,
    0
  );

  return {
    reconciliations,
    totalOpeningBalance,
    totalReceived,
    totalPaid,
    totalCalculatedBalance,
    getTransactionsByAccount,
    isLoading,
  };
};
