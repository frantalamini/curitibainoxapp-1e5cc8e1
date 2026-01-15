import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodInsert {
  name: string;
  active?: boolean;
  sort_order?: number;
}

export const usePaymentMethods = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: paymentMethods, isLoading, error } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as PaymentMethod[];
    },
  });

  const activePaymentMethods = paymentMethods?.filter(pm => pm.active) || [];

  const createPaymentMethod = useMutation({
    mutationFn: async (paymentMethod: PaymentMethodInsert) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .insert(paymentMethod)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento criada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar forma de pagamento", variant: "destructive" });
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar forma de pagamento", variant: "destructive" });
    },
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Forma de pagamento excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir forma de pagamento", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update({ active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });

  return {
    paymentMethods: paymentMethods || [],
    activePaymentMethods,
    isLoading,
    error,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    toggleActive,
  };
};
