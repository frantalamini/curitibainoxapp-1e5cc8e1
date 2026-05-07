import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TextElement {
  type: "titulo" | "subtitulo" | "texto" | "rodape";
  content: string;
  font_size: number;
  bold: boolean;
  color: string;
  is_variable: boolean;
  align?: "left" | "center" | "right";
}

export interface QRTemplate {
  id: string;
  name: string;
  width_cm: number;
  height_cm: number;
  logo_position: number; // 0-8 grid position
  logo_size_cm: number;
  qr_position: number; // 0-8 grid position
  qr_size_cm: number;
  bg_enabled: boolean;
  bg_width_pct: number;
  bg_color: string;
  text_elements: TextElement[];
  extra_elements: any[];
  times_used: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type QRTemplateInsert = Omit<
  QRTemplate,
  "id" | "created_at" | "updated_at" | "created_by" | "times_used"
>;

const TABLE = "qr_templates";

export const useQRTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QRTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: QRTemplateInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert([{ ...template, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as QRTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({ title: "Sucesso", description: "Template criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<QRTemplate> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as QRTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({ title: "Sucesso", description: "Template removido com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  };
};

export const useQRTemplate = (id?: string) => {
  return useQuery({
    queryKey: [TABLE, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as QRTemplate;
    },
    enabled: !!id,
  });
};
