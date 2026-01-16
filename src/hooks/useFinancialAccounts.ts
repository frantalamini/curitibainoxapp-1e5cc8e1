import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FinancialAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_type: "bank" | "cash" | "other";
  opening_balance: number;
  opening_balance_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FinancialAccountInsert = Omit<FinancialAccount, "id" | "created_at" | "updated_at">;
export type FinancialAccountUpdate = Partial<FinancialAccountInsert>;

export const useFinancialAccounts = () => {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ["financial-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as FinancialAccount[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: FinancialAccountInsert) => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Conta bancária criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & FinancialAccountUpdate) => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Conta bancária atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar conta: ${error.message}`);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
      toast.success("Conta bancária excluída com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir conta: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("financial_accounts")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-accounts"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    accounts,
    activeAccounts: accounts.filter((a) => a.is_active),
    isLoading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleActive,
  };
};
