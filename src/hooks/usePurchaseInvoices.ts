import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InvoiceStatus = "PENDING" | "VALIDATED" | "BOOKED" | "CANCELLED";

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_series: string;
  invoice_key: string | null;
  order_id: string | null;
  receipt_id: string | null;
  supplier_id: string;
  status: InvoiceStatus;
  issue_date: string;
  subtotal: number;
  freight: number;
  insurance: number;
  other_costs: number;
  discount: number;
  total: number;
  icms_base: number;
  icms_value: number;
  ipi_value: number;
  pis_value: number;
  cofins_value: number;
  cfop: string | null;
  financial_generated: boolean;
  xml_content: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: { id: string; full_name: string; cpf_cnpj: string | null } | null;
  purchase_orders?: { id: string; order_number: number } | null;
  purchase_receipts?: { id: string; receipt_number: number } | null;
  profiles?: { user_id: string; full_name: string } | null;
}

export interface InvoiceInsert {
  invoice_number: string;
  invoice_series?: string;
  invoice_key?: string | null;
  order_id?: string | null;
  receipt_id?: string | null;
  supplier_id: string;
  issue_date: string;
  subtotal: number;
  freight?: number;
  insurance?: number;
  other_costs?: number;
  discount?: number;
  total: number;
  icms_base?: number;
  icms_value?: number;
  ipi_value?: number;
  pis_value?: number;
  cofins_value?: number;
  cfop?: string | null;
  xml_content?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface InvoicesFilters {
  status?: InvoiceStatus | "ALL";
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export const usePurchaseInvoices = (filters?: InvoicesFilters) => {
  const queryClient = useQueryClient();

  const {
    data: invoices,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-invoices", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_invoices")
        .select(
          `
          *,
          supplier:clients!purchase_invoices_supplier_id_fkey (id, full_name, cpf_cnpj),
          purchase_orders (id, order_number),
          purchase_receipts (id, receipt_number),
          profiles!purchase_invoices_created_by_profiles_fkey (user_id, full_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters?.startDate) {
        query = query.gte("issue_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("issue_date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseInvoice[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .insert([invoice])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("NF de entrada registrada!");
    },
    onError: (error) => {
      console.error("Erro ao registrar NF:", error);
      toast.error("Erro ao registrar NF de entrada");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<InvoiceInsert & { status: InvoiceStatus }>) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      const { data, error } = await supabase
        .from("purchase_invoices")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("NF atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar NF:", error);
      toast.error("Erro ao atualizar NF");
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("NF excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir NF:", error);
      toast.error("Erro ao excluir NF");
    },
  });

  // Escriturar NF: gera lançamentos financeiros (contas a pagar)
  const bookInvoice = useMutation({
    mutationFn: async ({
      invoiceId,
      categoryId,
      costCenterId,
      financialAccountId,
    }: {
      invoiceId: string;
      categoryId?: string;
      costCenterId?: string;
      financialAccountId?: string;
    }) => {
      // 1. Buscar NF
      const { data: invoice, error: nfError } = await supabase
        .from("purchase_invoices")
        .select(
          `*, purchase_orders (id, order_number, payment_terms, supplier_id)`,
        )
        .eq("id", invoiceId)
        .single();
      if (nfError) throw nfError;
      if (invoice.financial_generated)
        throw new Error("Financeiro já gerado para esta NF");

      // 2. Parsear condições de pagamento para gerar parcelas
      const paymentTerms =
        invoice.purchase_orders?.payment_terms ||
        (invoice as any).payment_terms ||
        "";
      const installments = parsePaymentTerms(
        paymentTerms,
        invoice.total,
        invoice.issue_date,
      );

      // 3. Gerar grupo de parcelas
      const groupId = crypto.randomUUID();

      // 4. Criar transações financeiras (contas a pagar)
      const transactions = installments.map((inst, idx) => ({
        direction: "PAY" as const,
        origin: "PURCHASE_ORDER" as const,
        status: "OPEN" as const,
        client_id: invoice.supplier_id,
        amount: inst.amount,
        due_date: inst.dueDate,
        description: `NF ${invoice.invoice_number} - ${installments.length > 1 ? `Parcela ${idx + 1}/${installments.length}` : "À vista"}`,
        notes: `Pedido #${invoice.purchase_orders?.order_number || "N/A"}`,
        category_id: categoryId || null,
        cost_center_id: costCenterId || null,
        financial_account_id: financialAccountId || null,
        installment_number: installments.length > 1 ? idx + 1 : null,
        installments_total:
          installments.length > 1 ? installments.length : null,
        installments_group_id: installments.length > 1 ? groupId : null,
      }));

      const { error: ftError } = await supabase
        .from("financial_transactions")
        .insert(transactions);
      if (ftError) throw ftError;

      // 5. Marcar NF como escriturada
      const { data, error } = await supabase
        .from("purchase_invoices")
        .update({ status: "BOOKED", financial_generated: true })
        .eq("id", invoiceId)
        .select()
        .single();
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("NF escriturada! Contas a pagar geradas.");
    },
    onError: (error: Error) => {
      console.error("Erro ao escriturar NF:", error);
      toast.error(error.message || "Erro ao escriturar NF");
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("NF cancelada.");
    },
    onError: (error) => {
      console.error("Erro ao cancelar NF:", error);
      toast.error("Erro ao cancelar NF");
    },
  });

  return {
    invoices: invoices || [],
    isLoading,
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    bookInvoice,
    cancelInvoice,
  };
};

// Utilitário: parsear payment_terms ("30/60/90" ou "À vista") em parcelas
function parsePaymentTerms(
  terms: string,
  total: number,
  issueDate: string,
): { amount: number; dueDate: string }[] {
  if (!terms || terms.toLowerCase().includes("vista")) {
    return [{ amount: total, dueDate: issueDate }];
  }

  const days = terms
    .split(/[/,;\s]+/)
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d > 0);

  if (days.length === 0) {
    return [{ amount: total, dueDate: issueDate }];
  }

  const installmentAmount = Math.round((total / days.length) * 100) / 100;
  const remainder =
    Math.round((total - installmentAmount * days.length) * 100) / 100;

  return days.map((d, idx) => {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + d);
    return {
      amount: idx === 0 ? installmentAmount + remainder : installmentAmount,
      dueDate: date.toISOString().split("T")[0],
    };
  });
}
