import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  direction: "RECEIVE" | "PAY";
  category_id: string | null;
  cost_center_id: string | null;
  financial_account_id: string | null;
  client_id: string | null;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_month: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: { name: string } | null;
  cost_center?: { name: string } | null;
  financial_account?: { name: string } | null;
  client?: { full_name: string } | null;
}

export interface RecurringTransactionInput {
  description: string;
  amount: number;
  direction: "RECEIVE" | "PAY";
  category_id?: string | null;
  cost_center_id?: string | null;
  financial_account_id?: string | null;
  client_id?: string | null;
  day_of_month: number;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export const useRecurringTransactions = () => {
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["recurring-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select(`
          *,
          category:financial_categories(name),
          cost_center:cost_centers(name),
          financial_account:financial_accounts(name),
          client:clients(full_name)
        `)
        .order("description", { ascending: true });

      if (error) throw error;
      return data as RecurringTransaction[];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async (input: RecurringTransactionInput) => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Lançamento recorrente criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating recurring transaction:", error);
      toast.error("Erro ao criar lançamento recorrente");
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...input }: RecurringTransactionInput & { id: string }) => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Lançamento recorrente atualizado!");
    },
    onError: (error) => {
      console.error("Error updating recurring transaction:", error);
      toast.error("Erro ao atualizar lançamento recorrente");
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Lançamento recorrente excluído!");
    },
    onError: (error) => {
      console.error("Error deleting recurring transaction:", error);
      toast.error("Erro ao excluir lançamento recorrente");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      console.error("Error toggling recurring transaction:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  // Generate transactions for a specific month
  const generateForMonth = useMutation({
    mutationFn: async (targetMonth: Date) => {
      const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
      const monthStr = monthStart.toISOString().substring(0, 10);

      // Get active recurring transactions that should be generated for this month
      const { data: activeRecurring, error: fetchError } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", monthEnd.toISOString().substring(0, 10))
        .or(`end_date.is.null,end_date.gte.${monthStr}`);

      if (fetchError) throw fetchError;

      const toGenerate = activeRecurring?.filter(r => {
        // Check if already generated for this month
        if (r.last_generated_month) {
          const lastGen = new Date(r.last_generated_month);
          if (lastGen.getFullYear() === monthStart.getFullYear() && 
              lastGen.getMonth() === monthStart.getMonth()) {
            return false;
          }
        }
        return true;
      }) || [];

      if (toGenerate.length === 0) {
        toast.info("Nenhum lançamento pendente para gerar neste mês");
        return { generated: 0 };
      }

      // Generate transactions
      const transactionsToInsert = toGenerate.map(r => {
        const dueDay = Math.min(r.day_of_month, monthEnd.getDate());
        const dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dueDay);
        
        return {
          description: r.description,
          amount: r.amount,
          direction: r.direction,
          category_id: r.category_id,
          cost_center_id: r.cost_center_id,
          financial_account_id: r.financial_account_id,
          client_id: r.client_id,
          due_date: dueDate.toISOString().substring(0, 10),
          origin: "MANUAL" as const,
          status: "OPEN" as const,
          notes: `Gerado automaticamente de: ${r.description}`,
        };
      });

      const { error: insertError } = await supabase
        .from("financial_transactions")
        .insert(transactionsToInsert);

      if (insertError) throw insertError;

      // Update last_generated_month for all generated recurring transactions
      const updatePromises = toGenerate.map(r =>
        supabase
          .from("recurring_transactions")
          .update({ last_generated_month: monthStr })
          .eq("id", r.id)
      );

      await Promise.all(updatePromises);

      return { generated: toGenerate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success(`${result.generated} lançamentos gerados com sucesso!`);
    },
    onError: (error) => {
      console.error("Error generating transactions:", error);
      toast.error("Erro ao gerar lançamentos");
    },
  });

  return {
    transactions,
    isLoading,
    refetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    toggleActive,
    generateForMonth,
  };
};
