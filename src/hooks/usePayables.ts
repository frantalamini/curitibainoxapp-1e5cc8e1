import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Payable {
  id: string;
  direction: "PAY";
  origin: "MANUAL";
  status: "OPEN" | "PAID" | "CANCELED" | "PARTIAL";
  client_id: string | null;
  due_date: string;
  amount: number;
  discount: number | null;
  interest: number | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  financial_account_id: string | null;
  description: string | null;
  created_at: string | null;
  issue_date: string | null;
  document_number: string | null;
  installment_number: number | null;
  installments_total: number | null;
  installments_group_id: string | null;
  credit_card_id: string | null;
  credit_card_statement_date: string | null;
  supplier?: {
    full_name: string;
    cpf_cnpj: string | null;
  } | null;
  category?: {
    name: string;
  } | null;
  cost_center?: {
    name: string;
  } | null;
}

export interface PayableInsert {
  client_id?: string | null;
  description: string;
  due_date: string;
  amount: number;
  category_id?: string | null;
  cost_center_id?: string | null;
  financial_account_id?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  credit_card_id?: string | null;
  credit_card_statement_date?: string | null;
  issue_date?: string | null;
  document_number?: string | null;
}

export interface InstallmentRow {
  due_date: string;
  amount: number;
  credit_card_statement_date?: string | null;
}

export interface PayableInsertWithInstallments extends PayableInsert {
  purchase_type: "avista" | "parcelada";
  installments?: InstallmentRow[];
}

interface PayablesFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  supplierId?: string;
  categoryId?: string;
  costCenterId?: string;
}

export function usePayables(filters?: PayablesFilters) {
  const queryClient = useQueryClient();

  const {
    data: payables = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payables", filters],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(
          `
          *,
          supplier:clients(full_name, cpf_cnpj),
          category:financial_categories(name),
          cost_center:cost_centers(name)
        `,
        )
        .eq("direction", "PAY")
        .order("due_date", { ascending: true });

      if (filters?.startDate) {
        query = query.gte("due_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("due_date", filters.endDate);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq(
          "status",
          filters.status as "OPEN" | "PAID" | "CANCELED" | "PARTIAL",
        );
      }
      if (filters?.supplierId) {
        query = query.eq("client_id", filters.supplierId);
      }
      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters?.costCenterId) {
        query = query.eq("cost_center_id", filters.costCenterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Payable[];
    },
  });

  const createPayable = useMutation({
    mutationFn: async (data: PayableInsertWithInstallments) => {
      const baseRow = {
        direction: "PAY" as const,
        origin: "MANUAL" as const,
        status: "OPEN" as const,
        client_id: data.client_id || null,
        description: data.description,
        category_id: data.category_id || null,
        cost_center_id: data.cost_center_id || null,
        financial_account_id: data.financial_account_id || null,
        payment_method: data.payment_method || null,
        notes: data.notes || null,
        credit_card_id: data.credit_card_id || null,
        issue_date: data.issue_date || null,
        document_number: data.document_number || null,
      };

      if (
        data.purchase_type === "parcelada" &&
        data.installments &&
        data.installments.length > 1
      ) {
        const groupId = crypto.randomUUID();
        const rows = data.installments.map((inst, idx) => ({
          ...baseRow,
          due_date: inst.due_date,
          amount: inst.amount,
          installments_group_id: groupId,
          installment_number: idx + 1,
          installments_total: data.installments!.length,
          credit_card_statement_date: inst.credit_card_statement_date || null,
        }));

        const { error } = await supabase
          .from("financial_transactions")
          .insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financial_transactions").insert({
          ...baseRow,
          due_date: data.due_date,
          amount: data.amount,
          credit_card_statement_date: data.credit_card_statement_date || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Conta a pagar criada!");
    },
    onError: (error) => {
      console.error("Erro ao criar conta a pagar:", error);
      toast.error("Erro ao criar conta a pagar");
    },
  });

  const updatePayable = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PayableInsert>;
      /** Quando true, não exibe toast de sucesso (edição inline na tabela) */
      silent?: boolean;
    }) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          client_id: data.client_id,
          description: data.description,
          due_date: data.due_date,
          amount: data.amount,
          category_id: data.category_id,
          cost_center_id: data.cost_center_id,
          financial_account_id: data.financial_account_id,
          payment_method: data.payment_method,
          notes: data.notes,
          credit_card_id: data.credit_card_id,
          credit_card_statement_date: data.credit_card_statement_date,
          issue_date: data.issue_date,
          document_number: data.document_number,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      if (!variables.silent) toast.success("Conta a pagar atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar conta a pagar:", error);
      toast.error("Erro ao atualizar conta a pagar");
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
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Conta marcada como paga!");
    },
    onError: (error) => {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao marcar como pago");
    },
  });

  const cancelPayable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({ status: "CANCELED" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Conta cancelada!");
    },
    onError: (error) => {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar conta");
    },
  });

  const deletePayable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Conta excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir conta");
    },
  });

  const openPayables = payables.filter((p) => p.status === "OPEN");
  const paidPayables = payables.filter((p) => p.status === "PAID");
  const totalOpen = openPayables.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = paidPayables.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAll = payables
    .filter((p) => p.status !== "CANCELED")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    payables,
    isLoading,
    error,
    createPayable,
    updatePayable,
    markAsPaid,
    cancelPayable,
    deletePayable,
    summary: {
      totalOpen,
      totalPaid,
      totalAll,
      countOpen: openPayables.length,
      countPaid: paidPayables.length,
    },
  };
}
