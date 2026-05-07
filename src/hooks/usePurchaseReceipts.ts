import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReceiptStatus =
  | "PENDING"
  | "INSPECTING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIAL";

export interface PurchaseReceipt {
  id: string;
  receipt_number: number;
  order_id: string;
  supplier_id: string;
  status: ReceiptStatus;
  received_at: string;
  received_by: string | null;
  inspection_notes: string | null;
  has_divergence: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  supplier?: { id: string; full_name: string } | null;
  purchase_orders?: { id: string; order_number: number; total: number } | null;
  profiles?: { user_id: string; full_name: string } | null;
  purchase_receipt_items?: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  order_item_id: string | null;
  product_id: string | null;
  description: string;
  qty_expected: number;
  qty_received: number;
  qty_rejected: number;
  unit_cost: number | null;
  rejection_reason: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  stock_updated: boolean;
  notes: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null } | null;
}

export interface ReceiptInsert {
  order_id: string;
  supplier_id: string;
  received_by?: string | null;
  inspection_notes?: string | null;
  notes?: string | null;
}

export interface ReceiptItemInsert {
  receipt_id: string;
  order_item_id?: string | null;
  product_id?: string | null;
  description: string;
  qty_expected: number;
  qty_received: number;
  qty_rejected?: number;
  unit_cost?: number | null;
  rejection_reason?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface ReceiptsFilters {
  status?: ReceiptStatus | "ALL";
  supplierId?: string;
  orderId?: string;
  startDate?: string;
  endDate?: string;
}

export const usePurchaseReceipts = (filters?: ReceiptsFilters) => {
  const queryClient = useQueryClient();

  const {
    data: receipts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-receipts", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_receipts")
        .select(
          `
          *,
          supplier:clients!purchase_receipts_supplier_id_fkey (id, full_name),
          purchase_orders (id, order_number, total),
          profiles!purchase_receipts_received_by_fkey_profiles (user_id, full_name),
          purchase_receipt_items (
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
      if (filters?.orderId) {
        query = query.eq("order_id", filters.orderId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseReceipt[];
    },
  });

  const createReceipt = useMutation({
    mutationFn: async (receipt: ReceiptInsert) => {
      const { data, error } = await supabase
        .from("purchase_receipts")
        .insert([receipt])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      toast.success("Recebimento registrado!");
    },
    onError: (error) => {
      console.error("Erro ao criar recebimento:", error);
      toast.error("Erro ao registrar recebimento");
    },
  });

  const updateReceipt = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      ReceiptInsert & { status: ReceiptStatus; has_divergence: boolean }
    >) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      const { data, error } = await supabase
        .from("purchase_receipts")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      toast.success("Recebimento atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar recebimento:", error);
      toast.error("Erro ao atualizar recebimento");
    },
  });

  const deleteReceipt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_receipts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      toast.success("Recebimento excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir recebimento:", error);
      toast.error("Erro ao excluir recebimento");
    },
  });

  // Aprovar recebimento: gera entrada de estoque + atualiza qty_received no pedido
  const approveReceipt = useMutation({
    mutationFn: async (receiptId: string) => {
      // 1. Buscar recebimento com itens
      const { data: receipt, error: rError } = await supabase
        .from("purchase_receipts")
        .select(
          `*, purchase_receipt_items (*), purchase_orders (id, order_number)`,
        )
        .eq("id", receiptId)
        .single();
      if (rError) throw rError;

      const items = receipt.purchase_receipt_items || [];
      const itemsWithProduct = items.filter(
        (i: any) => i.product_id && !i.stock_updated,
      );

      // 2. Criar movimentos de estoque (IN)
      if (itemsWithProduct.length > 0) {
        const stockMovements = itemsWithProduct.map((item: any) => ({
          product_id: item.product_id,
          type: "IN" as const,
          qty: item.qty_received,
          unit_cost: item.unit_cost,
          reference_type: "PURCHASE_ORDER",
          reference_id: receipt.order_id,
          notes: `Recebimento #${receipt.receipt_number} - Pedido #${receipt.purchase_orders?.order_number}`,
        }));

        const { error: smError } = await supabase
          .from("stock_movements")
          .insert(stockMovements);
        if (smError) throw smError;

        // 3. Marcar itens como estoque atualizado
        const itemIds = itemsWithProduct.map((i: any) => i.id);
        await supabase
          .from("purchase_receipt_items")
          .update({ stock_updated: true })
          .in("id", itemIds);
      }

      // 4. Atualizar qty_received nos itens do pedido
      for (const item of items) {
        if (item.order_item_id) {
          // Buscar qty_received atual
          const { data: orderItem } = await supabase
            .from("purchase_order_items")
            .select("qty_received")
            .eq("id", item.order_item_id)
            .single();

          const currentReceived = Number(orderItem?.qty_received || 0);
          await supabase
            .from("purchase_order_items")
            .update({
              qty_received: currentReceived + Number(item.qty_received),
            })
            .eq("id", item.order_item_id);
        }
      }

      // 5. Verificar se pedido foi totalmente recebido
      const { data: orderItems } = await supabase
        .from("purchase_order_items")
        .select("qty, qty_received")
        .eq("order_id", receipt.order_id);

      const allReceived = (orderItems || []).every(
        (oi: any) => Number(oi.qty_received) >= Number(oi.qty),
      );
      const someReceived = (orderItems || []).some(
        (oi: any) => Number(oi.qty_received) > 0,
      );

      // 6. Atualizar status do pedido
      const orderStatus = allReceived
        ? "RECEIVED"
        : someReceived
          ? "PARTIAL"
          : "SENT";
      await supabase
        .from("purchase_orders")
        .update({ status: orderStatus })
        .eq("id", receipt.order_id);

      // 7. Verificar divergência
      const hasDivergence = items.some(
        (i: any) =>
          Number(i.qty_rejected) > 0 ||
          Number(i.qty_received) !== Number(i.qty_expected),
      );

      // 8. Aprovar recebimento
      const { data, error } = await supabase
        .from("purchase_receipts")
        .update({
          status: "APPROVED",
          has_divergence: hasDivergence,
        })
        .eq("id", receiptId)
        .select()
        .single();
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Recebimento aprovado! Estoque atualizado.");
    },
    onError: (error: Error) => {
      console.error("Erro ao aprovar recebimento:", error);
      toast.error(error.message || "Erro ao aprovar recebimento");
    },
  });

  return {
    receipts: receipts || [],
    isLoading,
    error,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    approveReceipt,
  };
};

// Hook para itens do recebimento
export const usePurchaseReceiptItems = (receiptId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["purchase-receipt-items", receiptId],
    queryFn: async () => {
      if (!receiptId) return [];
      const { data, error } = await supabase
        .from("purchase_receipt_items")
        .select(`*, products (id, name, sku)`)
        .eq("receipt_id", receiptId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ReceiptItem[];
    },
    enabled: !!receiptId,
  });

  const addItem = useMutation({
    mutationFn: async (item: ReceiptItemInsert) => {
      const { data, error } = await supabase
        .from("purchase_receipt_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-receipt-items", receiptId],
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<ReceiptItemInsert>) => {
      const { data, error } = await supabase
        .from("purchase_receipt_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-receipt-items", receiptId],
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_receipt_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-receipt-items", receiptId],
      });
    },
  });

  return { items: items || [], isLoading, addItem, updateItem, removeItem };
};

// Criar recebimento a partir de pedido (preenche itens automaticamente)
export const useCreateReceiptFromOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      receivedBy,
    }: {
      orderId: string;
      receivedBy: string;
    }) => {
      // 1. Buscar pedido com itens
      const { data: order, error: oError } = await supabase
        .from("purchase_orders")
        .select(`*, purchase_order_items (*)`)
        .eq("id", orderId)
        .single();
      if (oError) throw oError;

      // 2. Criar recebimento
      const { data: receipt, error: rError } = await supabase
        .from("purchase_receipts")
        .insert({
          order_id: orderId,
          supplier_id: order.supplier_id,
          received_by: receivedBy,
        })
        .select()
        .single();
      if (rError) throw rError;

      // 3. Criar itens do recebimento com qtd pendente
      const receiptItems = (order.purchase_order_items || []).map(
        (oi: any) => ({
          receipt_id: receipt.id,
          order_item_id: oi.id,
          product_id: oi.product_id,
          description: oi.description,
          qty_expected: Number(oi.qty) - Number(oi.qty_received || 0),
          qty_received: Number(oi.qty) - Number(oi.qty_received || 0),
          unit_cost: oi.unit_cost,
        }),
      );

      if (receiptItems.length > 0) {
        const { error: iError } = await supabase
          .from("purchase_receipt_items")
          .insert(receiptItems);
        if (iError) throw iError;
      }

      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      toast.success("Recebimento criado a partir do pedido!");
    },
    onError: (error: Error) => {
      console.error("Erro ao criar recebimento do pedido:", error);
      toast.error(error.message || "Erro ao criar recebimento");
    },
  });
};
