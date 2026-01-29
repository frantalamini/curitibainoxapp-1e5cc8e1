import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReimbursementStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";

export interface TechnicianReimbursement {
  id: string;
  service_call_id: string;
  technician_id: string;
  receipt_photo_url: string;
  description: string | null;
  amount: number;
  ocr_extracted_amount: number | null;
  status: ReimbursementStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  payment_proof_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  technician?: {
    full_name: string;
    phone: string;
  } | null;
  service_call?: {
    os_number: number;
    equipment_description: string;
    clients?: {
      full_name: string;
    } | null;
  } | null;
}

export interface CreateReimbursementInput {
  service_call_id: string;
  technician_id: string;
  receipt_photo_url: string;
  description?: string;
  amount: number;
  ocr_extracted_amount?: number;
}

interface ReimbursementsFilters {
  serviceCallId?: string;
  technicianId?: string;
  status?: ReimbursementStatus | "all";
}

export function useTechnicianReimbursements(filters?: ReimbursementsFilters) {
  const queryClient = useQueryClient();

  const { data: reimbursements = [], isLoading, error } = useQuery({
    queryKey: ["technician-reimbursements", filters],
    queryFn: async () => {
      let query = supabase
        .from("technician_reimbursements")
        .select(`
          *,
          technician:technicians(full_name, phone),
          service_call:service_calls(os_number, equipment_description, clients(full_name))
        `)
        .order("requested_at", { ascending: false });

      if (filters?.serviceCallId) {
        query = query.eq("service_call_id", filters.serviceCallId);
      }
      if (filters?.technicianId) {
        query = query.eq("technician_id", filters.technicianId);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TechnicianReimbursement[];
    },
  });

  const createReimbursement = useMutation({
    mutationFn: async (input: CreateReimbursementInput) => {
      const { data, error } = await supabase
        .from("technician_reimbursements")
        .insert({
          service_call_id: input.service_call_id,
          technician_id: input.technician_id,
          receipt_photo_url: input.receipt_photo_url,
          description: input.description || null,
          amount: input.amount,
          ocr_extracted_amount: input.ocr_extracted_amount || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-reimbursements"] });
      toast.success("Solicitação de reembolso enviada!");
    },
    onError: (error: Error) => {
      console.error("Erro ao criar reembolso:", error);
      toast.error("Erro ao enviar solicitação de reembolso");
    },
  });

  const approveReimbursement = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("technician_reimbursements")
        .update({
          status: "APPROVED",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          notes: notes || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-reimbursements"] });
      toast.success("Reembolso aprovado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  const rejectReimbursement = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from("technician_reimbursements")
        .update({
          status: "REJECTED",
          notes: notes || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-reimbursements"] });
      toast.success("Reembolso rejeitado");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, paymentProofUrl }: { id: string; paymentProofUrl: string }) => {
      const { error } = await supabase
        .from("technician_reimbursements")
        .update({
          status: "PAID",
          paid_at: new Date().toISOString(),
          payment_proof_url: paymentProofUrl,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-reimbursements"] });
      toast.success("Reembolso marcado como pago!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar como pago: ${error.message}`);
    },
  });

  const deleteReimbursement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("technician_reimbursements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-reimbursements"] });
      toast.success("Reembolso excluído");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Calculate summary
  const pendingReimbursements = reimbursements.filter(r => r.status === "PENDING");
  const approvedReimbursements = reimbursements.filter(r => r.status === "APPROVED");
  const paidReimbursements = reimbursements.filter(r => r.status === "PAID");
  
  const totalPending = pendingReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalApproved = approvedReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPaid = paidReimbursements.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    reimbursements,
    isLoading,
    error,
    createReimbursement,
    approveReimbursement,
    rejectReimbursement,
    markAsPaid,
    deleteReimbursement,
    summary: {
      totalPending,
      totalApproved,
      totalPaid,
      countPending: pendingReimbursements.length,
      countApproved: approvedReimbursements.length,
      countPaid: paidReimbursements.length,
    },
  };
}
