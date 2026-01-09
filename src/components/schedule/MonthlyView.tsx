import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import ScheduleEventCard from "./ScheduleEventCard";
import { Technician } from "@/hooks/useTechnicians";
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

interface MonthlyViewProps {
  currentDate: Date;
  serviceCalls: ServiceCall[];
  technicians: Technician[];
  selectedTechnicianId: string;
}

const MonthlyView = ({
  currentDate,
  serviceCalls,
  technicians,
  selectedTechnicianId,
}: MonthlyViewProps) => {
  // Get days for the calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add empty days at the start to align with the correct day of week
    const startDayOfWeek = getDay(monthStart);
    const emptyDays = Array(startDayOfWeek).fill(null);

    return [...emptyDays, ...days];
  }, [currentDate]);

  // Filter and group service calls by date
  const callsByDate = useMemo(() => {
    const filtered = serviceCalls.filter((call) => {
      const callDate = parseLocalDate(call.scheduled_date);
      if (!isSameMonth(callDate, currentDate)) return false;

      if (selectedTechnicianId !== "all" && call.technician_id !== selectedTechnicianId) {
        return false;
      }

      return true;
    });

    const grouped = new Map<string, typeof filtered>();

    filtered.forEach((call) => {
      const dateKey = format(parseLocalDate(call.scheduled_date), "yyyy-MM-dd");
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, call]);
    });

    // Sort calls within each day by time
    grouped.forEach((calls) => {
      calls.sort((a, b) => {
        const timeA = a.scheduled_time || "00:00";
        const timeB = b.scheduled_time || "00:00";
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [serviceCalls, currentDate, selectedTechnicianId]);

  const weekDaysDesktop = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekDaysMobile = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-muted/50 border-b">
        {weekDaysDesktop.map((day, i) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-semibold text-muted-foreground"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysMobile[i]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 auto-rows-fr min-h-[300px] sm:min-h-[600px]">
        {calendarDays.map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className="border-r border-b bg-muted/20"
              />
            );
          }

          const dateKey = format(day, "yyyy-MM-dd");
          const dayCalls = callsByDate.get(dateKey) || [];
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              className={`border-r border-b p-1 sm:p-2 min-h-[60px] sm:min-h-[120px] ${
                isCurrentDay ? "bg-primary/5" : ""
              }`}
            >
              <div
                className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                  isCurrentDay
                    ? "bg-primary text-primary-foreground w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
                    : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </div>

              {/* Mobile: show count only */}
              <div className="sm:hidden">
                {dayCalls.length > 0 && (
                  <div className="text-xs text-center bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                    {dayCalls.length}
                  </div>
                )}
              </div>

              {/* Desktop: show event cards */}
              <div className="hidden sm:block space-y-1 overflow-y-auto max-h-[150px]">
                {dayCalls.map((call) => {
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
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
