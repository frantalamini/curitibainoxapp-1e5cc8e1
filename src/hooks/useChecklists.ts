import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

export interface Checklist {
  id: string;
  name: string;
  description: string | null;
  items: ChecklistItem[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistInsert {
  name: string;
  description?: string;
  items: ChecklistItem[];
  active?: boolean;
}

export const useChecklists = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checklists, isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklists")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        items: item.items as unknown as ChecklistItem[]
      })) as Checklist[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newChecklist: ChecklistInsert) => {
      const { data, error } = await supabase
        .from("checklists")
        .insert([{
          ...newChecklist,
          items: newChecklist.items as any
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast({
        title: "Sucesso",
        description: "Checklist criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar checklist: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Checklist> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.items) {
        updateData.items = updates.items;
      }
        
      const { data, error } = await supabase
        .from("checklists")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast({
        title: "Sucesso",
        description: "Checklist atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar checklist: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("checklists")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklists"] });
      toast({
        title: "Sucesso",
        description: "Checklist excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir checklist: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    checklists,
    isLoading,
    createChecklist: createMutation.mutate,
    updateChecklist: updateMutation.mutate,
    deleteChecklist: deleteMutation.mutate,
  };
};
