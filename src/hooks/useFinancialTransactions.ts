import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TransactionDirection = "RECEIVE" | "PAY";
export type TransactionOrigin = "SERVICE_CALL" | "MANUAL";
export type TransactionStatus = "OPEN" | "PAID" | "CANCELED" | "PARTIAL";

export interface FinancialTransaction {
  id: string;
  direction: TransactionDirection;
  origin: TransactionOrigin;
  status: TransactionStatus;
  service_call_id: string | null;
  client_id: string | null;
  due_date: string;
  paid_at: string | null;
  amount: number;
  discount: number;
  interest: number;
  payment_method: string | null;
  installment_number: number | null;
  installments_total: number | null;
  installments_group_id: string | null;
  notes: string | null;
  created_at: string;
  clients?: {
    id: string;
    full_name: string;
  } | null;
}

export interface FinancialTransactionInsert {
  direction: TransactionDirection;
  origin: TransactionOrigin;
  status?: TransactionStatus;
  service_call_id?: string | null;
  client_id?: string | null;
  due_date: string;
  paid_at?: string | null;
  amount: number;
  discount?: number;
  interest?: number;
  payment_method?: string | null;
  installment_number?: number | null;
  installments_total?: number | null;
  installments_group_id?: string | null;
  notes?: string | null;
}

export const useFinancialTransactions = (serviceCallId?: string) => {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["financial-transactions", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return [];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          *,
          clients (
            id,
            full_name
          )
        `)
        .eq("service_call_id", serviceCallId)
        .order("due_date")
        .order("installment_number");

      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!serviceCallId,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: FinancialTransactionInsert) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const createManyTransactions = useMutation({
    mutationFn: async (transactions: FinancialTransactionInsert[]) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .insert(transactions)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinancialTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .update({
          status: "PAID",
          paid_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const cancelTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .update({ status: "CANCELED" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  // Calculate summary
  const openTransactions = transactions?.filter(t => t.status === "OPEN") || [];
  const paidTransactions = transactions?.filter(t => t.status === "PAID") || [];
  
  const totalOpen = openTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalAll = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  return {
    transactions: transactions || [],
    openTransactions,
    paidTransactions,
    isLoading,
    error,
    createTransaction,
    createManyTransactions,
    updateTransaction,
    markAsPaid,
    cancelTransaction,
    deleteTransaction,
    summary: {
      open: totalOpen,
      paid: totalPaid,
      total: totalAll,
    },
  };
};
