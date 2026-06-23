import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Notas fiscais emitidas a partir da OS (fiscal_invoices).
 * Fase 1: NFSe (serviço). A emissão/cancelamento passa SEMPRE pela edge
 * function `emitir-nf` (service_role); o front nunca grava direto na tabela.
 *
 * Tabela nova, ainda fora dos tipos gerados — cliente "solto" + tipo local.
 */
export interface FiscalInvoice {
  id: string;
  service_call_id: string;
  tipo: "nfse" | "nfe";
  ambiente: "homologacao" | "producao";
  ref: string;
  status: "processando" | "autorizado" | "cancelado" | "erro";
  numero: string | null;
  codigo_verificacao: string | null;
  valor: number | null;
  url_danfse: string | null;
  caminho_xml: string | null;
  justificativa_cancelamento: string | null;
  mensagem_erro: string | null;
  cancelled_at: string | null;
  created_at: string;
}

const db = supabase as unknown as { from: (table: string) => any };

export const useFiscalInvoices = (serviceCallId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["fiscal-invoices", serviceCallId];

  const { data: invoices, isLoading } = useQuery({
    queryKey,
    enabled: !!serviceCallId,
    queryFn: async (): Promise<FiscalInvoice[]> => {
      const { data, error } = await db
        .from("fiscal_invoices")
        .select("*")
        .eq("service_call_id", serviceCallId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as FiscalInvoice[]) ?? [];
    },
  });

  // Nota "ativa" da NFSe: emitida ou em processamento (1 por OS, via índice único)
  const nfse =
    invoices?.find(
      (i) =>
        i.tipo === "nfse" &&
        (i.status === "autorizado" || i.status === "processando"),
    ) ??
    invoices?.find((i) => i.tipo === "nfse") ??
    null;

  const emitirNFSe = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("emitir-nf", {
        body: {
          action: "emitir",
          service_call_id: serviceCallId,
          tipo: "nfse",
        },
      });
      if (error) throw new Error(error.message || "Falha ao chamar a emissão");
      if (!data?.success) {
        // Mensagens amigáveis para os bloqueios conhecidos
        if (
          data?.error === "CLIENT_SEM_DOC" ||
          data?.error === "IBGE_TOMADOR_AUSENTE"
        ) {
          throw new Error(data.message || data.error);
        }
        throw new Error(data?.error || "Não foi possível emitir a nota");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      if (data.status === "autorizado") {
        toast.success(
          `NFSe autorizada${data.numero ? ` (nº ${data.numero})` : ""}!`,
        );
      } else {
        toast.info(data.message || "Nota em processamento.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Sincroniza uma nota "processando" com o provedor (quando a autorização
  // demora mais que o tempo de emissão). Silenciosa: sem toast.
  const consultarStatus = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("emitir-nf", {
        body: {
          action: "consultar",
          service_call_id: serviceCallId,
          tipo: "nfse",
        },
      });
      if (error) throw new Error(error.message || "Falha ao consultar status");
      return data;
    },
    onSuccess: (data) => {
      if (data?.status === "autorizado" || data?.status === "erro") {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const cancelarNFSe = useMutation({
    mutationFn: async (justificativa: string) => {
      const { data, error } = await supabase.functions.invoke("emitir-nf", {
        body: {
          action: "cancelar",
          service_call_id: serviceCallId,
          tipo: "nfse",
          justificativa,
        },
      });
      if (error)
        throw new Error(error.message || "Falha ao chamar o cancelamento");
      if (!data?.success)
        throw new Error(data?.error || "Não foi possível cancelar a nota");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("NFSe cancelada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    invoices,
    nfse,
    isLoading,
    emitirNFSe,
    cancelarNFSe,
    consultarStatus,
  };
};
