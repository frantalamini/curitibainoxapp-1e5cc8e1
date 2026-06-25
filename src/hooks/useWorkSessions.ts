import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Tipos do registro de tempo (sessões de atendimento).
// OBS: a tabela service_call_work_sessions ainda não está nos types gerados do
// Supabase; usamos um client "destipado" aqui até regenerar os types.
const sb = supabase as unknown as {
  from: (table: string) => any;
};

export type WorkSessionType = "trabalho" | "deslocamento" | "espera";

export interface WorkSession {
  id: string;
  service_call_id: string;
  technician_id: string | null;
  session_type: WorkSessionType;
  started_at: string;
  ended_at: string | null;
  interrupt_reason: string | null;
  notes: string | null;
  created_at: string;
}

// Motivos de pausa/retorno (chips de 1 toque). "outro" libera campo de texto.
export const INTERRUPT_REASONS: { value: string; label: string }[] = [
  { value: "cliente_pediu", label: "Cliente pediu para sair" },
  { value: "buscar_peca", label: "Foi buscar peça" },
  { value: "fim_expediente", label: "Fim do expediente" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "concluido", label: "Serviço concluído" },
  { value: "outro", label: "Outro" },
];

// Duração de uma sessão em horas (0 se ainda aberta).
export const sessionHours = (s: WorkSession): number => {
  if (!s.ended_at) return 0;
  const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
};

// Soma das horas das sessões de um tipo (default: trabalho = mão de obra).
export const sumHours = (
  sessions: WorkSession[],
  type: WorkSessionType | "todos" = "trabalho",
): number =>
  sessions
    .filter((s) => type === "todos" || s.session_type === type)
    .reduce((acc, s) => acc + sessionHours(s), 0);

export const useWorkSessions = (serviceCallId?: string) => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["work-sessions", serviceCallId],
    });
    // O lucro do chamado depende das horas trabalhadas.
    queryClient.invalidateQueries({ queryKey: ["os-profitability"] });
  };

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["work-sessions", serviceCallId],
    enabled: !!serviceCallId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("service_call_work_sessions")
        .select("*")
        .eq("service_call_id", serviceCallId)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkSession[];
    },
  });

  const openSession = sessions.find((s) => !s.ended_at) ?? null;

  // Iniciar / retomar: abre uma nova sessão.
  const startSession = useMutation({
    mutationFn: async (params: {
      technicianId?: string | null;
      sessionType?: WorkSessionType;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await sb.from("service_call_work_sessions").insert([
        {
          service_call_id: serviceCallId,
          technician_id: params.technicianId ?? null,
          session_type: params.sessionType ?? "trabalho",
          started_at: new Date().toISOString(),
          created_by: userData?.user?.id ?? null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) =>
      toast({
        title: "Erro ao iniciar atendimento",
        description: e.message,
        variant: "destructive",
      }),
  });

  // Pausar / concluir: fecha a sessão aberta com horário de fim e motivo.
  const endSession = useMutation({
    mutationFn: async (params: {
      sessionId: string;
      interruptReason?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await sb
        .from("service_call_work_sessions")
        .update({
          ended_at: new Date().toISOString(),
          interrupt_reason: params.interruptReason ?? null,
          notes: params.notes ?? null,
        })
        .eq("id", params.sessionId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) =>
      toast({
        title: "Erro ao encerrar sessão",
        description: e.message,
        variant: "destructive",
      }),
  });

  // Edição manual (corrige horário/tipo/motivo quando esqueceu de apertar).
  const updateSession = useMutation({
    mutationFn: async ({
      id,
      ...fields
    }: Partial<WorkSession> & { id: string }) => {
      const { error } = await sb
        .from("service_call_work_sessions")
        .update(fields)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) =>
      toast({
        title: "Erro ao editar sessão",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("service_call_work_sessions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) =>
      toast({
        title: "Erro ao excluir sessão",
        description: e.message,
        variant: "destructive",
      }),
  });

  return {
    sessions,
    openSession,
    isLoading,
    laborHours: sumHours(sessions, "trabalho"),
    startSession,
    endSession,
    updateSession,
    deleteSession,
  };
};
