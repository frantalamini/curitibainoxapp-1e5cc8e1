import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronUp,
  ChevronDown,
  History,
  Loader2,
  Clock,
  Wrench,
  Briefcase,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StatusLogEntry } from "@/hooks/useServiceCallStatusLog";

function parseDate(dateStr: string): Date {
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}

function computeGapDays(logs: StatusLogEntry[]): number | null {
  const concluded = logs.find(
    (l) => l.field_changed === "status_id" && l.new_status_name === "Concluído",
  );
  const released = logs.find(
    (l) =>
      l.field_changed === "commercial_status_id" &&
      l.new_status_name === "Liberado P/ Faturamento",
  );

  if (!concluded || !released) return null;

  return differenceInDays(
    parseDate(released.changed_at),
    parseDate(concluded.changed_at),
  );
}

interface StatusTimelineProps {
  logs: StatusLogEntry[];
  isLoading: boolean;
}

export const StatusTimeline = ({ logs, isLoading }: StatusTimelineProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const gapDays = computeGapDays(logs);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 pb-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Status
                {logs.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {logs.length}
                  </Badge>
                )}
                {gapDays !== null && gapDays > 0 && (
                  <Badge
                    variant={gapDays > 3 ? "destructive" : "outline"}
                    className="h-5 px-1.5 text-xs"
                  >
                    GAP: {gapDays} dia{gapDays !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-4 pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma alteração de status registrada.
              </p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="relative pl-6 space-y-0">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                  {logs.map((log, index) => {
                    const isTecnico = log.field_changed === "status_id";
                    const changedAt = parseDate(log.changed_at);

                    const showGap =
                      gapDays !== null &&
                      gapDays > 0 &&
                      log.field_changed === "commercial_status_id" &&
                      log.new_status_name === "Liberado P/ Faturamento";

                    return (
                      <div key={log.id}>
                        {showGap && (
                          <div className="relative flex items-center gap-2 py-2 -ml-6 pl-6">
                            <div className="absolute left-[7px] w-[9px] h-[9px] rounded-full bg-amber-400 border-2 border-background z-10" />
                            <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded px-2 py-1">
                              <Clock className="h-3 w-3" />
                              GAP: {gapDays} dia{gapDays !== 1 ? "s" : ""} entre
                              conclusão e liberação
                            </div>
                          </div>
                        )}

                        <div className="relative flex gap-3 pb-4">
                          <div
                            className={`absolute -left-6 top-1 w-[9px] h-[9px] rounded-full border-2 border-background z-10 ${
                              isTecnico ? "bg-blue-500" : "bg-orange-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isTecnico ? (
                                <Wrench className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              ) : (
                                <Briefcase className="h-3 w-3 text-orange-500 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium">
                                {isTecnico ? "Técnico" : "Comercial"}:
                              </span>
                              <span className="text-sm text-muted-foreground truncate">
                                {log.old_status_name || "—"} →{" "}
                                {log.new_status_name || "—"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              por {log.changed_by_name} —{" "}
                              {format(changedAt, "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}{" "}
                              (
                              {formatDistanceToNow(changedAt, {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                              )
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
