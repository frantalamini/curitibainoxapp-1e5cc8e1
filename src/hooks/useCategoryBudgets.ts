import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CategoryBudget {
  id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export const useCategoryBudgets = (year: number) => {
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading, refetch } = useQuery({
    queryKey: ["category-budgets", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("year", year);

      if (error) throw error;
      return data as CategoryBudget[];
    },
  });

  const upsertBudget = useMutation({
    mutationFn: async ({
      categoryId,
      year,
      month,
      amount,
    }: {
      categoryId: string;
      year: number;
      month: number;
      amount: number;
    }) => {
      const { data, error } = await supabase
        .from("category_budgets")
        .upsert(
          {
            category_id: categoryId,
            year,
            month,
            amount,
          },
          { onConflict: "category_id,year,month" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-budgets"] });
    },
    onError: (error) => {
      console.error("Error saving budget:", error);
      toast.error("Erro ao salvar orçamento");
    },
  });

  const getBudget = (categoryId: string, month: number): number => {
    const budget = budgets.find(
      (b) => b.category_id === categoryId && b.month === month
    );
    return budget?.amount || 0;
  };

  const getYearBudget = (categoryId: string): number => {
    return budgets
      .filter((b) => b.category_id === categoryId)
      .reduce((sum, b) => sum + b.amount, 0);
  };

  return {
    budgets,
    isLoading,
    refetch,
    upsertBudget,
    getBudget,
    getYearBudget,
  };
};
