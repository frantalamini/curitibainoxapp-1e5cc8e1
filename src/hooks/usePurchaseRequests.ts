import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PurchaseRequestStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "CANCELLED";
export type PurchaseRequestPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface PurchaseRequest {
  id: string;
  request_number: number;
  status: PurchaseRequestStatus;
  service_call_id: string | null;
  equipment_id: string | null;
  client_id: string | null;
  cost_center_id: string | null;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  priority: PurchaseRequestPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  clients?: { id: string; full_name: string } | null;
  cost_centers?: { id: string; name: string } | null;
  requested_profile?: { user_id: string; full_name: string } | null;
  approved_profile?: { user_id: string; full_name: string } | null;
  purchase_request_items?: PurchaseRequestItem[];
}

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit: string;
  estimated_unit_cost: number | null;
  notes: string | null;
  created_at: string;
  products?: { id: string; name: string; sku: string | null } | null;
}

export interface PurchaseRequestInsert {
  service_call_id?: string | null;
  equipment_id?: string | null;
  client_id?: string | null;
  cost_center_id?: string | null;
  requested_by: string;
  priority?: PurchaseRequestPriority;
  notes?: string | null;
}

export interface PurchaseRequestItemInsert {
  request_id: string;
  product_id?: string | null;
  description: string;
  qty: number;
  unit?: string;
  estimated_unit_cost?: number | null;
  notes?: string | null;
}

export interface PurchaseRequestsFilters {
  status?: PurchaseRequestStatus | "ALL";
  priority?: PurchaseRequestPriority | "ALL";
  requestedBy?: string;
  startDate?: string;
  endDate?: string;
}

export const usePurchaseRequests = (filters?: PurchaseRequestsFilters) => {
  const queryClient = useQueryClient();

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["purchase-requests", filters],
    queryFn: async () => {
      let query = supabase
        .from("purchase_requests")
        .select(
          `
          *,
          clients (id, full_name),
          cost_centers (id, name),
          requested_profile:profiles!purchase_requests_requested_by_fkey_profiles (user_id, full_name),
          approved_profile:profiles!purchase_requests_approved_by_fkey_profiles (user_id, full_name),
          purchase_request_items (
            *,
            products (id, name, sku)
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }
      if (filters?.priority && filters.priority !== "ALL") {
        query = query.eq("priority", filters.priority);
      }
      if (filters?.requestedBy) {
        query = query.eq("requested_by", filters.requestedBy);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (req: PurchaseRequestInsert) => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .insert([req])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação de compra criada!");
    },
    onError: (error) => {
      console.error("Erro ao criar solicitação:", error);
      toast.error("Erro ao criar solicitação de compra");
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<PurchaseRequestInsert>) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      const { data, error } = await supabase
        .from("purchase_requests")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar solicitação:", error);
      toast.error("Erro ao atualizar solicitação");
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação excluída!");
    },
    onError: (error) => {
      console.error("Erro ao excluir solicitação:", error);
      toast.error("Erro ao excluir solicitação");
    },
  });

  const submitForApproval = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .update({ status: "PENDING" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação enviada para aprovação!");
    },
    onError: (error) => {
      console.error("Erro ao enviar para aprovação:", error);
      toast.error("Erro ao enviar para aprovação");
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({
      id,
      approvedBy,
    }: {
      id: string;
      approvedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("purchase_requests")
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
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação aprovada!");
    },
    onError: (error) => {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar solicitação");
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({
      id,
      approvedBy,
      reason,
    }: {
      id: string;
      approvedBy: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .update({
          status: "REJECTED",
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação rejeitada.");
    },
    onError: (error) => {
      console.error("Erro ao rejeitar:", error);
      toast.error("Erro ao rejeitar solicitação");
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast.success("Solicitação cancelada.");
    },
    onError: (error) => {
      console.error("Erro ao cancelar:", error);
      toast.error("Erro ao cancelar solicitação");
    },
  });

  // Counts
  const drafts = requests?.filter((r) => r.status === "DRAFT") || [];
  const pending = requests?.filter((r) => r.status === "PENDING") || [];
  const approved = requests?.filter((r) => r.status === "APPROVED") || [];

  return {
    requests: requests || [],
    drafts,
    pending,
    approved,
    isLoading,
    error,
    createRequest,
    updateRequest,
    deleteRequest,
    submitForApproval,
    approveRequest,
    rejectRequest,
    cancelRequest,
  };
};

// Hook para itens de solicitação
export const usePurchaseRequestItems = (requestId?: string) => {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["purchase-request-items", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("purchase_request_items")
        .select(`*, products (id, name, sku)`)
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PurchaseRequestItem[];
    },
    enabled: !!requestId,
  });

  const addItem = useMutation({
    mutationFn: async (item: PurchaseRequestItemInsert) => {
      const { data, error } = await supabase
        .from("purchase_request_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-request-items", requestId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<PurchaseRequestItemInsert>) => {
      const { data, error } = await supabase
        .from("purchase_request_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-request-items", requestId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_request_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["purchase-request-items", requestId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  return {
    items: items || [],
    isLoading,
    addItem,
    updateItem,
    removeItem,
  };
};

// Hook para buscar uma solicitação específica
export const usePurchaseRequest = (id?: string) => {
  return useQuery({
    queryKey: ["purchase-request", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("purchase_requests")
        .select(
          `
          *,
          clients (id, full_name),
          cost_centers (id, name),
          requested_profile:profiles!purchase_requests_requested_by_fkey_profiles (user_id, full_name),
          approved_profile:profiles!purchase_requests_approved_by_fkey_profiles (user_id, full_name),
          purchase_request_items (
            *,
            products (id, name, sku)
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as PurchaseRequest | null;
    },
    enabled: !!id,
  });
};
