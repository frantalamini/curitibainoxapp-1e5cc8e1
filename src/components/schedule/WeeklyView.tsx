import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import ScheduleEventCard from "./ScheduleEventCard";
import { Technician } from "@/hooks/useTechnicians";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseLocalDate } from "@/lib/dateUtils";

interface ServiceCall {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  equipment_description: string;
  notes?: string | null;
  urgency?: string;
  technician_id: string;
  clients?: {
    full_name: string;
    company_name?: string;
    phone?: string;
  } | null;
}

interface WeeklyViewProps {
  currentDate: Date;
  serviceCalls: ServiceCall[];
  technicians: Technician[];
  selectedTechnicianId: string;
}

const WeeklyView = ({
  currentDate,
  serviceCalls,
  technicians,
  selectedTechnicianId,
}: WeeklyViewProps) => {
  const isMobile = useIsMobile();

  // Get days of the week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Group service calls by date
  const callsByDate = useMemo(() => {
    const filtered = serviceCalls.filter((call) => {
      if (selectedTechnicianId !== "all" && call.technician_id !== selectedTechnicianId) {
        return false;
      }
      return true;
    });

    const grouped = new Map<string, typeof filtered>();

    weekDays.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayCalls = filtered.filter((call) =>
        isSameDay(parseLocalDate(call.scheduled_date), day)
      );
      dayCalls.sort((a, b) => {
        const timeA = a.scheduled_time || "00:00";
        const timeB = b.scheduled_time || "00:00";
        return timeA.localeCompare(timeB);
      });
      grouped.set(dateKey, dayCalls);
    });

    return grouped;
  }, [serviceCalls, weekDays, selectedTechnicianId]);

  // Mobile: List view by day
  if (isMobile) {
    return (
      <div className="space-y-4">
        {weekDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayCalls = callsByDate.get(dateKey) || [];
          const isCurrentDay = isToday(day);

          return (
            <div key={dateKey} className="bg-card rounded-lg border overflow-hidden">
              {/* Day Header */}
              <div
                className={`px-4 py-3 border-b ${
                  isCurrentDay ? "bg-primary/10" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-semibold capitalize ${isCurrentDay ? "text-primary" : ""}`}>
                      {format(day, "EEEE", { locale: ptBR })}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {format(day, "dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                  {dayCalls.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {dayCalls.length} chamado{dayCalls.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Day Events */}
              <div className="p-3">
                {dayCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Sem agendamentos
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayCalls.map((call) => {
                      const techName =
                        technicians?.find((t) => t.id === call.technician_id)?.full_name ||
                        "Sem técnico";

                      return (
                        <ScheduleEventCard
                          key={call.id}
                          call={call}
                          technicianName={techName}
                          variant="normal"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop: Grid view
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-muted/50 border-b">
        {weekDays.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={`p-3 text-center border-r last:border-r-0 ${
                isCurrentDay ? "bg-primary/10" : ""
              }`}
            >
              <div className={`text-sm font-semibold capitalize ${isCurrentDay ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={`text-lg font-bold mt-1 ${
                  isCurrentDay
                    ? "bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                    : ""
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-7 min-h-[500px]">
        {weekDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayCalls = callsByDate.get(dateKey) || [];
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              className={`border-r last:border-r-0 p-2 ${
                isCurrentDay ? "bg-primary/5" : ""
              }`}
            >
              <div className="space-y-2 overflow-y-auto max-h-[450px]">
                {dayCalls.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem chamados
                  </p>
                ) : (
                  dayCalls.map((call) => {
                    const techName =
                      technicians?.find((t) => t.id === call.technician_id)?.full_name ||
                      "Sem técnico";

                    return (
                      <ScheduleEventCard
                        key={call.id}
                        call={call}
                        technicianName={techName}
                        variant="compact"
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyView;
