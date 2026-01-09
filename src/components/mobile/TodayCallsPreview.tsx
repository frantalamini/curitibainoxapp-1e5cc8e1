import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { ServiceCallQuickActions } from "./ServiceCallQuickActions";

interface TodayCall {
  id: string;
  os_number: number;
  scheduled_time: string;
  scheduled_date: string;
  client_name: string;
  equipment_description: string;
  status_name?: string;
  status_color?: string;
}

interface TodayCallsPreviewProps {
  calls: TodayCall[];
  upcomingCalls?: TodayCall[];
  openTripsMap: Record<string, boolean>;
  onOpenOS: (id: string) => void;
  onStartTrip: (id: string) => void;
  onEndTrip: (id: string) => void;
  isLoading?: boolean;
}

export function TodayCallsPreview({
  calls,
  upcomingCalls = [],
  openTripsMap,
  onOpenOS,
  onStartTrip,
  onEndTrip,
  isLoading,
}: TodayCallsPreviewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const hasTodayCalls = calls.length > 0;
  const hasUpcomingCalls = upcomingCalls.length > 0;

  // No calls at all
  if (!hasTodayCalls && !hasUpcomingCalls) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 text-center">
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum chamado agendado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Today's Calls Section */}
      {hasTodayCalls && (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Chamados de Hoje
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 -mr-2"
              onClick={() => navigate("/schedule")}
            >
              Ver todos
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="divide-y divide-border/50">
            {calls.slice(0, 5).map((call) => {
              const hasOpenTrip = openTripsMap[call.id] || false;
              
              return (
                <div
                  key={call.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">OS #{call.os_number}</span>
                        <span className="text-xs text-muted-foreground">
                          {call.scheduled_time}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 break-words whitespace-normal">{call.client_name}</p>
                      <p className="text-xs text-muted-foreground break-words whitespace-normal">{call.equipment_description}</p>
                    </div>
                    {call.status_color && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
                        style={{ backgroundColor: call.status_color }}
                      >
                        {call.status_name}
                      </span>
                    )}
                  </div>

                  <ServiceCallQuickActions
                    onOpenOS={() => onOpenOS(call.id)}
                    onStartTrip={() => onStartTrip(call.id)}
                    onEndTrip={() => onEndTrip(call.id)}
                    hasOpenTrip={hasOpenTrip}
                    canStartTrip={true}
                    showTripActions={true}
                  />
                </div>
              );
            })}
          </div>

          {calls.length > 5 && (
            <div className="p-2 border-t border-border/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => navigate("/schedule")}
              >
                +{calls.length - 5} chamados mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Calls Section (next days) */}
      {hasUpcomingCalls && (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Próximos
            </h3>
          </div>

          <div className="divide-y divide-border/50">
            {upcomingCalls.slice(0, 5).map((call) => {
              const formattedDate = format(parseLocalDate(call.scheduled_date), "dd/MM", { locale: ptBR });
              
              return (
                <button
                  key={call.id}
                  onClick={() => onOpenOS(call.id)}
                  className="w-full p-3 hover:bg-muted/50 transition-colors text-left flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {formattedDate}
                      </span>
                      <span className="font-semibold text-sm">OS #{call.os_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {call.scheduled_time}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 break-words whitespace-normal mt-0.5">{call.client_name}</p>
                    <p className="text-xs text-muted-foreground break-words whitespace-normal">{call.equipment_description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>

          {upcomingCalls.length > 5 && (
            <div className="p-2 border-t border-border/50 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => navigate("/schedule")}
              >
                +{upcomingCalls.length - 5} chamados mais
              </Button>
            </div>
          )}
        </div>
      )}

      {/* If no today calls but has upcoming, show a message */}
      {!hasTodayCalls && hasUpcomingCalls && (
        <div className="text-center text-xs text-muted-foreground">
          Nenhum chamado para hoje
        </div>
      )}
    </div>
  );
}
