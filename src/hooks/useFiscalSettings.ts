import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Configurações Fiscais (Emissor de NF) — fonte única de parametrização.
 * Tabela de 1 linha (fiscal_settings). Lida pela tela de Configurações Fiscais
 * (Gerencial) e, no servidor, pela edge function de emissão (via service_role).
 *
 * A tabela é nova e ainda não está nos tipos gerados do Supabase, por isso
 * usamos um cliente "solto" (as any) com uma interface tipada local.
 */
export interface FiscalSettings {
  id: string;
  provider: string;
  ambiente: "homologacao" | "producao";
  token_homologacao: string | null;
  token_producao: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  regime_tributario: string | null;
  optante_simples_nacional: boolean;
  incentivador_cultural: boolean;
  codigo_municipio: string | null;
  codigo_servico: string | null;
  item_lista_servico: string | null;
  nbs: string | null;
  cnae: string | null;
  aliquota_iss: number | null;
  iss_retido: boolean;
  natureza_operacao: string | null;
  discriminacao_template: string;
  observacoes_template: string;
  updated_at: string;
}

// Cliente sem checagem de tipos para a tabela ainda não tipada
const db = supabase as unknown as {
  from: (table: string) => any;
};

export const useFiscalSettings = () => {
  const queryClient = useQueryClient();

  const { data: fiscal, isLoading } = useQuery({
    queryKey: ["fiscal-settings"],
    queryFn: async (): Promise<FiscalSettings | null> => {
      const { data, error } = await db
        .from("fiscal_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as FiscalSettings) ?? null;
    },
    staleTime: 10 * 60 * 1000,
  });

  const updateFiscalSettings = useMutation({
    mutationFn: async (updates: Partial<FiscalSettings>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!fiscal?.id) {
        throw new Error("Configuração fiscal não encontrada.");
      }

      const { data, error } = await db
        .from("fiscal_settings")
        .update({
          ...updates,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fiscal.id)
        .select()
        .single();

      if (error) throw error;
      return data as FiscalSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-settings"] });
      toast.success("Configurações fiscais salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return { fiscal, isLoading, updateFiscalSettings };
};
