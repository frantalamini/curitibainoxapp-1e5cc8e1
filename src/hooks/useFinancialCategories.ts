import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FinancialCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FinancialCategoryInsert = Omit<FinancialCategory, "id" | "created_at" | "updated_at">;
export type FinancialCategoryUpdate = Partial<FinancialCategoryInsert>;

export const useFinancialCategories = () => {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .order("type")
        .order("name");

      if (error) throw error;
      return data as FinancialCategory[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: FinancialCategoryInsert) => {
      const { data, error } = await supabase
        .from("financial_categories")
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Categoria criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & FinancialCategoryUpdate) => {
      const { data, error } = await supabase
        .from("financial_categories")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Categoria atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Categoria excluída com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("financial_categories")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Helper to get categories by type
  const incomeCategories = categories.filter((c) => c.type === "income" && c.is_active);
  const expenseCategories = categories.filter((c) => c.type === "expense" && c.is_active);

  return {
    categories,
    incomeCategories,
    expenseCategories,
    activeCategories: categories.filter((c) => c.is_active),
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleActive,
  };
};
