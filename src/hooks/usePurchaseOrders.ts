import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "SENT"
  | "PARTIAL"
  | "RECEIVED"
  | "CANCELLED";

export interface PurchaseOrder {
  id: string;
  order_number: number;
  status: PurchaseOrderStatus;
  quotation_id: string | null;
  request_id: string | null;
  supplier_id: string;
  service_call_id: string | null;
  cost_center_id: string | null;
  subtotal: number;
  freight_cost: number;
  discount_percent: number;
  discount_value: number;
  total: number;
  payment_terms: string | null;
  expected_delivery: string | null;
  delivery_address: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    cpf_cnpj: string | null;
  } | null;
  cost_centers?: { id: string; name: string } | null;
  profiles?: { user_id: string; full_name: string } | null;
  approved_profile?: { user_id: string; full_name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  total: number;
  qty_received: number;
  notes: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null } | null;
}

export interface PurchaseOrderInsert {
  quotation_id?: string | null;
  request_id?: string | null;
  supplier_id: string;
  service_call_id?: string | null;
  cost_center_id?: string | null;
  subtotal?: number;
  freight_cost?: number;
  discount_percent?: number;
  discount_value?: number;
  total?: number;
  payment_terms?: string | null;
  expected_delivery?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  created_by: string;
}

export interface PurchaseOrderItemInsert {
  order_id: string;
  product_id?: string | null;
  description: string;
  qty: number;
  unit?: string;
  unit_cost: number;
  notes?: string | null;
}

export interface PurchaseOrdersFilters {
  status?: PurchaseOrderStatus | "ALL";
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export const usePurchaseOrders = (filters?: PurchaseOrdersFilters) => {
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-orders", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:clients!purchase_orders_supplier_id_fkey (id, full_name, phone, email, cpf_cnpj),
          cost_centers (id, name),
          profiles!purchase_orders_created_by_fkey_profiles (user_id, full_name),
          approved_profile:profiles!purchase_orders_approved_by_fkey_profiles (user_id, full_name),
          purchase_order_items (
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
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: PurchaseOrderInsert) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert([order])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido de compra criado!");
    },
    onError: (error) => {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido de compra");
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      PurchaseOrderInsert & { status: PurchaseOrderStatus }
    >) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      const { data, error } = await supabase
        .from("purchase_orders")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar pedido:", error);
      toast.error("Erro ao atualizar pedido");
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir pedido:", error);
      toast.error("Erro ao excluir pedido");
    },
  });

  const approveOrder = useMutation({
    mutationFn: async ({
      id,
      approvedBy,
    }: {
      id: string;
      approvedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({
          status: "APPROVED",
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido aprovado!");
    },
    onError: (error) => {
      console.error("Erro ao aprovar pedido:", error);
      toast.error("Erro ao aprovar pedido");
    },
  });

  const markAsSent = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({ status: "SENT", sent_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido enviado ao fornecedor!");
    },
    onError: (error) => {
      console.error("Erro ao enviar pedido:", error);
      toast.error("Erro ao enviar pedido");
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Pedido cancelado.");
    },
    onError: (error) => {
      console.error("Erro ao cancelar pedido:", error);
      toast.error("Erro ao cancelar pedido");
    },
  });

  // Criar pedido a partir de cotação selecionada
  const createFromQuotation = useMutation({
    mutationFn: async ({
      quotationId,
      createdBy,
    }: {
      quotationId: string;
      createdBy: string;
    }) => {
      // 1. Buscar cotação com itens
      const { data: quotation, error: qError } = await supabase
        .from("purchase_quotations")
        .select(`*, purchase_quotation_items (*)`)
        .eq("id", quotationId)
        .single();
      if (qError) throw qError;

      // 2. Criar pedido
      const { data: order, error: oError } = await supabase
        .from("purchase_orders")
        .insert({
          quotation_id: quotationId,
          request_id: quotation.request_id,
          supplier_id: quotation.supplier_id,
          subtotal: quotation.subtotal,
          freight_cost: quotation.freight_cost,
          discount_percent: quotation.discount_percent,
          total: quotation.total,
          payment_terms: quotation.payment_terms,
          notes: quotation.notes,
          created_by: createdBy,
        })
        .select()
        .single();
      if (oError) throw oError;

      // 3. Copiar itens
      const orderItems = (quotation.purchase_quotation_items || []).map(
        (qi: any) => ({
          order_id: order.id,
          product_id: qi.product_id,
          description: qi.description,
          qty: qi.qty,
          unit: qi.unit,
          unit_cost: qi.unit_cost,
        }),
      );

      if (orderItems.length > 0) {
        const { error: iError } = await supabase
          .from("purchase_order_items")
          .insert(orderItems);
        if (iError) throw iError;
      }

      // 4. Marcar cotação como selecionada
      await supabase
        .from("purchase_quotations")
        .update({ status: "SELECTED" })
        .eq("id", quotationId);

      // 5. Marcar solicitação como pedida
      if (quotation.request_id) {
        await supabase
          .from("purchase_requests")
          .update({ status: "ORDERED" })
          .eq("id", quotation.request_id);
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-quotations"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Pedido de compra gerado a partir da cotação!");
    },
    onError: (error: Error) => {
      console.error("Erro ao gerar pedido:", error);
      toast.error(error.message || "Erro ao gerar pedido da cotação");
    },
  });

  return {
    orders: orders || [],
    isLoading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    approveOrder,
    markAsSent,
    cancelOrder,
    createFromQuotation,
  };
};

// Hook para itens do pedido
export const usePurchaseOrderItems = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["purchase-order-items", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`*, products (id, name, sku)`)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!orderId,
  });

  const addItem = useMutation({
    mutationFn: async (item: PurchaseOrderItemInsert) => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-items", orderId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<PurchaseOrderItemInsert>) => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-items", orderId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-order-items", orderId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  return { items: items || [], isLoading, addItem, updateItem, removeItem };
};

// Hook para buscar um pedido específico
export const usePurchaseOrder = (id?: string) => {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:clients!purchase_orders_supplier_id_fkey (id, full_name, phone, email, cpf_cnpj),
          cost_centers (id, name),
          profiles!purchase_orders_created_by_fkey_profiles (user_id, full_name),
          approved_profile:profiles!purchase_orders_approved_by_fkey_profiles (user_id, full_name),
          purchase_order_items (
            *,
            products (id, name, sku)
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as PurchaseOrder | null;
    },
    enabled: !!id,
  });
};
