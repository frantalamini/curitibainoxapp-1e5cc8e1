import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Receivable {
  id: string;
  direction: "RECEIVE";
  origin: "SERVICE_CALL" | "MANUAL";
  status: "OPEN" | "PAID" | "CANCELED" | "PARTIAL";
  service_call_id: string | null;
  client_id: string | null;
  due_date: string;
  amount: number;
  discount: number | null;
  interest: number | null;
  paid_at: string | null;
  payment_method: string | null;
  installment_number: number | null;
  installments_total: number | null;
  installments_group_id: string | null;
  notes: string | null;
  category_id: string | null;
  financial_account_id: string | null;
  description: string | null;
  created_at: string | null;
  // Joined data
  client?: {
    full_name: string;
    cpf_cnpj: string | null;
  } | null;
  service_call?: {
    os_number: number;
    equipment_description: string;
  } | null;
}

interface ReceivablesFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  clientId?: string;
  osNumber?: string;
}

export function useReceivables(filters?: ReceivablesFilters) {
  const queryClient = useQueryClient();

  const {
    data: receivables = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["receivables", filters],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          client:clients(full_name, cpf_cnpj),
          service_call:service_calls(os_number, equipment_description)
        `)
        .eq("direction", "RECEIVE")
        .order("due_date", { ascending: true });

      if (filters?.startDate) {
        query = query.gte("due_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("due_date", filters.endDate);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as "OPEN" | "PAID" | "CANCELED" | "PARTIAL");
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by OS number if provided (post-query since it's a joined field)
      let result = data as Receivable[];
      if (filters?.osNumber) {
        const osNum = parseInt(filters.osNumber, 10);
        if (!isNaN(osNum)) {
          result = result.filter(r => r.service_call?.os_number === osNum);
        }
      }

      return result;
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({
      id,
      paidAt,
      financialAccountId,
    }: {
      id: string;
      paidAt: string;
      financialAccountId?: string;
    }) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          status: "PAID",
          paid_at: paidAt,
          financial_account_id: financialAccountId || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Título marcado como pago!");
    },
    onError: (error) => {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar como pago");
    },
  });

  const cancelReceivable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({ status: "CANCELED" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Título cancelado!");
    },
    onError: (error) => {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar título");
    },
  });

  // Calculate summary
  const openReceivables = receivables.filter((r) => r.status === "OPEN");
  const paidReceivables = receivables.filter((r) => r.status === "PAID");
  const totalOpen = openReceivables.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPaid = paidReceivables.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAll = receivables
    .filter((r) => r.status !== "CANCELED")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    receivables,
    isLoading,
    error,
    markAsPaid,
    cancelReceivable,
    summary: {
      totalOpen,
      totalPaid,
      totalAll,
      countOpen: openReceivables.length,
      countPaid: paidReceivables.length,
    },
  };
}
