import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSettings {
  id: string;
  logo_url: string | null;
  report_logo: string | null;
  company_name: string;
  company_cnpj: string | null;
  company_ie: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  company_address: string | null;
  updated_at: string;
}

export const useSystemSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data as SystemSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("system_settings")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar configurações:", error);
      toast.error("Erro ao atualizar configurações");
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
