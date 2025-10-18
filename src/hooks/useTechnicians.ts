import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Technician = {
  id: string;
  technician_number: number;
  full_name: string;
  phone: string;
  specialty_refrigeration: boolean;
  specialty_cooking: boolean;
  additional_notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TechnicianInsert = Omit<Technician, "id" | "technician_number" | "created_at" | "updated_at">;

export const useTechnicians = () => {
  const queryClient = useQueryClient();

  const { data: technicians, isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("technician_number", { ascending: true });

      if (error) throw error;
      return data as Technician[];
    },
  });

  const createTechnician = useMutation({
    mutationFn: async (technician: TechnicianInsert) => {
      const { data, error } = await supabase
        .from("technicians")
        .insert([technician])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      toast({
        title: "Técnico criado",
        description: "Técnico criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar técnico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTechnician = useMutation({
    mutationFn: async ({ id, ...technician }: Partial<Technician> & { id: string }) => {
      const { data, error } = await supabase
        .from("technicians")
        .update(technician)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      toast({
        title: "Técnico atualizado",
        description: "Técnico atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar técnico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTechnician = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("technicians")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      toast({
        title: "Técnico excluído",
        description: "Técnico excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir técnico",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    technicians,
    isLoading,
    createTechnician,
    updateTechnician,
    deleteTechnician,
  };
};
