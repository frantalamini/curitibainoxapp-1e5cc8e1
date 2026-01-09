import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Calendar } from "lucide-react";
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
  openTripsMap: Record<string, boolean>;
  onOpenOS: (id: string) => void;
  onStartTrip: (id: string) => void;
  onEndTrip: (id: string) => void;
  isLoading?: boolean;
}

export function TodayCallsPreview({
  calls,
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

  if (calls.length === 0) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-4 text-center">
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum chamado para hoje</p>
      </div>
    );
  }

  return (
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
        {calls.slice(0, 3).map((call) => {
          const hasOpenTrip = openTripsMap[call.id] || false;
          
          return (
            <div
              key={call.id}
              className="p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">OS #{call.os_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {call.scheduled_time}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 truncate">{call.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{call.equipment_description}</p>
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

      {calls.length > 3 && (
        <div className="p-2 border-t border-border/50 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs w-full"
            onClick={() => navigate("/schedule")}
          >
            +{calls.length - 3} chamados mais
          </Button>
        </div>
      )}
    </div>
  );
}
