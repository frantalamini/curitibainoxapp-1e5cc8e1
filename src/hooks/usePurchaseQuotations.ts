import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QuotationStatus =
  | "PENDING"
  | "SENT"
  | "RECEIVED"
  | "SELECTED"
  | "REJECTED"
  | "EXPIRED";

export interface PurchaseQuotation {
  id: string;
  quotation_number: number;
  request_id: string | null;
  supplier_id: string;
  status: QuotationStatus;
  sent_at: string | null;
  response_deadline: string | null;
  received_at: string | null;
  payment_terms: string | null;
  delivery_days: number | null;
  freight_cost: number;
  discount_percent: number;
  subtotal: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
  purchase_requests?: { id: string; request_number: number } | null;
  profiles?: { user_id: string; full_name: string } | null;
  purchase_quotation_items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  request_item_id: string | null;
  product_id: string | null;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total: number;
  notes: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null } | null;
}

export interface QuotationInsert {
  request_id?: string | null;
  supplier_id: string;
  response_deadline?: string | null;
  payment_terms?: string | null;
  delivery_days?: number | null;
  freight_cost?: number;
  discount_percent?: number;
  notes?: string | null;
  created_by?: string | null;
}

export interface QuotationItemInsert {
  quotation_id: string;
  request_item_id?: string | null;
  product_id?: string | null;
  description: string;
  qty: number;
  unit?: string;
  unit_cost: number;
  notes?: string | null;
}

export interface QuotationsFilters {
  status?: QuotationStatus | "ALL";
  supplierId?: string;
  requestId?: string;
  startDate?: string;
  endDate?: string;
}

export const usePurchaseQuotations = (filters?: QuotationsFilters) => {
  const queryClient = useQueryClient();

  const {
    data: quotations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-quotations", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_quotations")
        .select(
          `
          *,
          supplier:clients!purchase_quotations_supplier_id_fkey (id, full_name, phone, email),
          purchase_requests (id, request_number),
          profiles!purchase_quotations_created_by_fkey_profiles (user_id, full_name),
          purchase_quotation_items (
            *,
            products (id, name, sku)
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters?.requestId) {
        query = query.eq("request_id", filters.requestId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseQuotation[];
    },
  });

  const createQuotation = useMutation({
    mutationFn: async (q: QuotationInsert) => {
      const { data, error } = await supabase
        .from("purchase_quotations")
        .insert([q])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação criada!");
    },
    onError: (error) => {
      console.error("Erro ao criar cotação:", error);
      toast.error("Erro ao criar cotação");
    },
  });

  const updateQuotation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      QuotationInsert & {
        status: QuotationStatus;
        subtotal: number;
        total: number;
      }
    >) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      const { data, error } = await supabase
        .from("purchase_quotations")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cotação:", error);
      toast.error("Erro ao atualizar cotação");
    },
  });

  const deleteQuotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_quotations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir cotação:", error);
      toast.error("Erro ao excluir cotação");
    },
  });

  const markAsSent = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_quotations")
        .update({ status: "SENT", sent_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação marcada como enviada!");
    },
    onError: (error) => {
      console.error("Erro ao marcar como enviada:", error);
      toast.error("Erro ao marcar como enviada");
    },
  });

  const markAsReceived = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_quotations")
        .update({ status: "RECEIVED", received_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação recebida!");
    },
    onError: (error) => {
      console.error("Erro ao receber cotação:", error);
      toast.error("Erro ao receber cotação");
    },
  });

  const selectQuotation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_quotations")
        .update({ status: "SELECTED" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      toast.success("Cotação selecionada!");
    },
    onError: (error) => {
      console.error("Erro ao selecionar cotação:", error);
      toast.error("Erro ao selecionar cotação");
    },
  });

  return {
    quotations: quotations || [],
    isLoading,
    error,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    markAsSent,
    markAsReceived,
    selectQuotation,
  };
};

// Hook para itens de cotação
export const usePurchaseQuotationItems = (quotationId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["purchase-quotation-items", quotationId],
    queryFn: async () => {
      if (!quotationId) return [];
      const { data, error } = await supabase
        .from("purchase_quotation_items")
        .select(`*, products (id, name, sku)`)
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as QuotationItem[];
    },
    enabled: !!quotationId,
  });

  const addItem = useMutation({
    mutationFn: async (item: QuotationItemInsert) => {
      const { data, error } = await supabase
        .from("purchase_quotation_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-quotation-items", quotationId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<QuotationItemInsert>) => {
      const { data, error } = await supabase
        .from("purchase_quotation_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-quotation-items", quotationId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_quotation_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-quotation-items", quotationId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
    },
  });

  return { items: items || [], isLoading, addItem, updateItem, removeItem };
};

// Hook para buscar cotações de uma solicitação (para o mapa de cotações)
export const useQuotationsByRequest = (requestId?: string) => {
  return useQuery({
    queryKey: ["purchase-quotations-by-request", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("purchase_quotations")
        .select(
          `
          *,
          supplier:clients!purchase_quotations_supplier_id_fkey (id, full_name),
          purchase_quotation_items (
            *,
            products (id, name, sku)
          )
        `,
        )
        .eq("request_id", requestId)
        .order("total", { ascending: true });
      if (error) throw error;
      return data as PurchaseQuotation[];
    },
    enabled: !!requestId,
  });
};
