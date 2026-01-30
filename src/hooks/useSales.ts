import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json, Database } from "@/integrations/supabase/types";

type TransactionDirection = Database["public"]["Enums"]["transaction_direction"];
type TransactionOrigin = Database["public"]["Enums"]["transaction_origin"];

export type SaleStatus = "QUOTE" | "APPROVED" | "SALE" | "INVOICED" | "CANCELLED";

export interface Sale {
  id: string;
  sale_number: number;
  status: SaleStatus;
  client_id: string;
  seller_id: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  total: number;
  commission_percent: number;
  commission_value: number;
  notes: string | null;
  quote_valid_until: string | null;
  approved_at: string | null;
  invoiced_at: string | null;
  invoice_number: string | null;
  payment_config: Json | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
    cpf_cnpj: string | null;
  } | null;
  profiles?: {
    user_id: string;
    full_name: string;
  } | null;
}

export interface SaleInsert {
  client_id: string;
  seller_id?: string | null;
  subtotal?: number;
  discount_type?: string;
  discount_value?: number;
  total?: number;
  commission_percent?: number;
  commission_value?: number;
  notes?: string | null;
  quote_valid_until?: string | null;
  payment_config?: Json | null;
  created_by: string;
}

export interface SaleUpdate {
  id: string;
  status?: SaleStatus;
  client_id?: string;
  seller_id?: string | null;
  subtotal?: number;
  discount_type?: string;
  discount_value?: number;
  total?: number;
  commission_percent?: number;
  commission_value?: number;
  notes?: string | null;
  quote_valid_until?: string | null;
  approved_at?: string | null;
  invoiced_at?: string | null;
  invoice_number?: string | null;
  payment_config?: Json | null;
}

export interface SalesFilters {
  status?: SaleStatus | "ALL";
  clientId?: string;
  sellerId?: string;
  startDate?: string;
  endDate?: string;
}

export const useSales = (filters?: SalesFilters) => {
  const queryClient = useQueryClient();

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ["sales", filters],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select(`
          *,
          clients (
            id,
            full_name,
            phone,
            email,
            cpf_cnpj
          ),
          profiles!sales_seller_id_fkey (
            user_id,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }
      if (filters?.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Sale[];
    },
  });

  const createSale = useMutation({
    mutationFn: async (sale: SaleInsert) => {
      const { data, error } = await supabase
        .from("sales")
        .insert([sale])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Orçamento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating sale:", error);
      toast.error("Erro ao criar orçamento");
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, ...updates }: SaleUpdate) => {
      // Remove undefined values to avoid type issues
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      const { data, error } = await supabase
        .from("sales")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Erro ao atualizar venda");
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting sale:", error);
      toast.error("Erro ao excluir venda");
    },
  });

  const approveSale = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("sales")
        .update({
          status: "APPROVED" as SaleStatus,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Orçamento aprovado!");
    },
    onError: (error) => {
      console.error("Error approving sale:", error);
      toast.error("Erro ao aprovar orçamento");
    },
  });

  const cancelSale = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("sales")
        .update({ status: "CANCELLED" as SaleStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda cancelada!");
    },
    onError: (error) => {
      console.error("Error cancelling sale:", error);
      toast.error("Erro ao cancelar venda");
    },
  });

  // Finalize sale: update status to SALE, deduct stock, and generate financial transactions
  const finalizeSale = useMutation({
    mutationFn: async (id: string) => {
      // 1. Get sale and items
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("id", id)
        .single();

      if (saleError) throw saleError;
      if (!sale) throw new Error("Venda não encontrada");

      // 2. Check stock for all items with product_id
      const itemsWithProduct = (sale.sale_items || []).filter(
        (item: any) => item.product_id && !item.stock_deducted
      );

      if (itemsWithProduct.length > 0) {
        // Get current stock for each product
        const productIds = itemsWithProduct.map((i: any) => i.product_id);
        const { data: stockBalances, error: stockError } = await supabase
          .from("product_stock_balance")
          .select("product_id, balance")
          .in("product_id", productIds);

        if (stockError) throw stockError;

        // Check if all items have sufficient stock
        for (const item of itemsWithProduct) {
          const balance = stockBalances?.find((b: any) => b.product_id === item.product_id)?.balance || 0;
          if (balance < item.qty) {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", item.product_id)
              .single();
            throw new Error(`Estoque insuficiente para: ${product?.name || "Produto"} (disponível: ${balance}, necessário: ${item.qty})`);
          }
        }

        // 3. Create stock movements (OUT)
        const stockMovements = itemsWithProduct.map((item: any) => ({
          product_id: item.product_id,
          type: "OUT" as const,
          qty: item.qty,
          reference_type: "SALE",
          reference_id: id,
          notes: `Baixa automática - Venda #${sale.sale_number}`,
        }));

        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert(stockMovements);

        if (movementError) throw movementError;

        // Mark items as stock deducted
        const itemIds = itemsWithProduct.map((i: any) => i.id);
        await supabase
          .from("sale_items")
          .update({ stock_deducted: true })
          .in("id", itemIds);
      }

      // 4. Generate financial transaction (single entry for now, can expand to installments)
      const { error: transactionError } = await supabase
        .from("financial_transactions")
        .insert({
          direction: "RECEIVE" as TransactionDirection,
          origin: "SALE" as TransactionOrigin,
          status: "OPEN",
          client_id: sale.client_id,
          amount: sale.total,
          due_date: new Date().toISOString().split("T")[0],
          description: `Venda #${sale.sale_number}`,
          notes: sale.notes,
        });

      if (transactionError) throw transactionError;

      // 5. Update sale status
      const { data, error } = await supabase
        .from("sales")
        .update({
          status: "SALE" as SaleStatus,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Venda finalizada com sucesso! Estoque atualizado e financeiro gerado.");
    },
    onError: (error: Error) => {
      console.error("Error finalizing sale:", error);
      toast.error(error.message || "Erro ao finalizar venda");
    },
  });

  // Count by status for tabs
  const quotes = sales?.filter((s) => s.status === "QUOTE") || [];
  const approved = sales?.filter((s) => s.status === "APPROVED") || [];
  const completed = sales?.filter((s) => s.status === "SALE" || s.status === "INVOICED") || [];
  const cancelled = sales?.filter((s) => s.status === "CANCELLED") || [];

  return {
    sales: sales || [],
    quotes,
    approved,
    completed,
    cancelled,
    isLoading,
    error,
    createSale,
    updateSale,
    deleteSale,
    approveSale,
    cancelSale,
    finalizeSale,
  };
};

export const useSale = (id?: string) => {
  return useQuery({
    queryKey: ["sale", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          clients (
            id,
            full_name,
            phone,
            email,
            cpf_cnpj,
            address,
            city,
            state
          ),
          profiles!sales_seller_id_fkey (
            user_id,
            full_name
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Sale | null;
    },
    enabled: !!id,
  });
};
