import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Play,
  Square,
  Truck,
  Clock,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useWorkSessions,
  INTERRUPT_REASONS,
  sessionHours,
  type WorkSession,
  type WorkSessionType,
} from "@/hooks/useWorkSessions";

interface WorkSessionTimerProps {
  serviceCallId?: string;
  technicianId?: string | null;
  disabled?: boolean;
}

// "1.25" -> "1h15"
const formatHm = (hours: number) => {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

// segundos -> "HH:MM:SS" (cronômetro ao vivo)
const formatClock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
};

const TYPE_LABEL: Record<WorkSessionType, string> = {
  trabalho: "Trabalho",
  deslocamento: "Deslocamento",
  espera: "Espera",
};

const reasonLabel = (value: string | null) =>
  value
    ? (INTERRUPT_REASONS.find((r) => r.value === value)?.label ?? value)
    : null;

export function WorkSessionTimer({
  serviceCallId,
  technicianId,
  disabled,
}: WorkSessionTimerProps) {
  const {
    sessions,
    openSession,
    laborHours,
    startSession,
    endSession,
    updateSession,
    deleteSession,
  } = useWorkSessions(serviceCallId);

  // Cronômetro ao vivo da sessão aberta
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!openSession) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openSession]);

  // Painel de "encerrar com motivo"
  const [endingReason, setEndingReason] = useState<string | null>(null);
  const [showReasonPanel, setShowReasonPanel] = useState(false);

  // Edição manual de uma sessão
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  if (!serviceCallId) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Salve o chamado para registrar o tempo de atendimento.
      </div>
    );
  }

  const elapsedSec = openSession
    ? Math.max(
        0,
        Math.floor((nowMs - new Date(openSession.started_at).getTime()) / 1000),
      )
    : 0;

  const handleStart = (sessionType: WorkSessionType) =>
    startSession.mutate({ technicianId, sessionType });

  const handleConfirmEnd = () => {
    if (!openSession) return;
    endSession.mutate(
      { sessionId: openSession.id, interruptReason: endingReason },
      {
        onSuccess: () => {
          setShowReasonPanel(false);
          setEndingReason(null);
        },
      },
    );
  };

  const beginEdit = (s: WorkSession) => {
    setEditingId(s.id);
    setEditStart(format(new Date(s.started_at), "yyyy-MM-dd'T'HH:mm"));
    setEditEnd(
      s.ended_at ? format(new Date(s.ended_at), "yyyy-MM-dd'T'HH:mm") : "",
    );
  };

  const saveEdit = (id: string) => {
    updateSession.mutate(
      {
        id,
        started_at: new Date(editStart).toISOString(),
        ended_at: editEnd ? new Date(editEnd).toISOString() : null,
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* Cabeçalho — enquadramento: registro do atendimento, não vigilância */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium">Registro de atendimento</span>
        </div>
        <Badge variant="secondary" className="gap-1">
          Mão de obra: {formatHm(laborHours)}
        </Badge>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Uso interno. Não aparece no relatório do cliente. Serve para registrar o
        tempo real e justificar retornos.
      </p>

      {/* Sessão em andamento */}
      {openSession ? (
        <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {TYPE_LABEL[openSession.session_type]} em andamento
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {formatClock(elapsedSec)}
            </span>
          </div>

          {!showReasonPanel ? (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={disabled || endSession.isPending}
              onClick={() => setShowReasonPanel(true)}
            >
              <Square className="mr-2 h-4 w-4" />
              Encerrar sessão
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Por que está encerrando?</p>
              <div className="flex flex-wrap gap-2">
                {INTERRUPT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setEndingReason(r.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      endingReason === r.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={endSession.isPending}
                  onClick={handleConfirmEnd}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowReasonPanel(false);
                    setEndingReason(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sem sessão aberta — iniciar / retomar */
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            disabled={disabled || startSession.isPending}
            onClick={() => handleStart("trabalho")}
          >
            <Play className="mr-2 h-4 w-4" />
            {sessions.length > 0 ? "Retomar trabalho" : "Iniciar trabalho"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={disabled || startSession.isPending}
            onClick={() => handleStart("deslocamento")}
          >
            <Truck className="mr-2 h-4 w-4" />
            Iniciar deslocamento
          </Button>
        </div>
      )}

      {/* Lista de sessões */}
      {sessions.length > 0 && (
        <div className="space-y-1.5">
          {sessions.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="flex-1 text-xs text-muted-foreground">
                        Início
                        <Input
                          type="datetime-local"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          className="mt-1"
                        />
                      </label>
                      <label className="flex-1 text-xs text-muted-foreground">
                        Fim
                        <Input
                          type="datetime-local"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          className="mt-1"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveEdit(s.id)}
                        disabled={updateSession.isPending}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Salvar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            s.session_type === "trabalho"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {TYPE_LABEL[s.session_type]}
                        </Badge>
                        <span className="tabular-nums text-muted-foreground">
                          {format(new Date(s.started_at), "dd/MM HH:mm")}
                          {" → "}
                          {s.ended_at
                            ? format(new Date(s.ended_at), "HH:mm")
                            : "agora"}
                        </span>
                        {s.ended_at && (
                          <span className="font-medium">
                            {formatHm(sessionHours(s))}
                          </span>
                        )}
                      </div>
                      {reasonLabel(s.interrupt_reason) && (
                        <span className="text-xs text-muted-foreground">
                          {reasonLabel(s.interrupt_reason)}
                        </span>
                      )}
                    </div>
                    {!disabled && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => beginEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteSession.mutate(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkSessionTimer;
