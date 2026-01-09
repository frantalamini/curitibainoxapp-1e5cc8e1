import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import ScheduleEventCard from "./ScheduleEventCard";
import { Technician } from "@/hooks/useTechnicians";
import { parseLocalDate } from "@/lib/dateUtils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";

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
  onCallClick?: (callId: string) => void;
}

const MonthlyView = ({
  currentDate,
  serviceCalls,
  technicians,
  selectedTechnicianId,
  onCallClick,
}: MonthlyViewProps) => {
  // State for mobile day sheet
  const [selectedDayCalls, setSelectedDayCalls] = useState<ServiceCall[]>([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>("");
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  // Handler for day click on mobile
  const handleDayClick = (day: Date, calls: ServiceCall[]) => {
    setSelectedDayLabel(format(day, "dd 'de' MMMM", { locale: ptBR }));
    setSelectedDayCalls(calls);
    setDaySheetOpen(true);
  };

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

              {/* Mobile: show count only - clickable */}
              <div className="sm:hidden">
                {dayCalls.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDayClick(day, dayCalls)}
                    className="w-full text-xs text-center bg-primary/10 text-primary rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-primary/20 active:bg-primary/30 transition-colors"
                  >
                    {dayCalls.length}
                  </button>
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
                      onClick={() => onCallClick?.(call.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Sheet with day's calls */}
      <Sheet open={daySheetOpen} onOpenChange={setDaySheetOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Chamados de {selectedDayLabel}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(70vh-80px)]">
            {selectedDayCalls.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum chamado para este dia.
              </p>
            ) : (
              selectedDayCalls.map((call) => {
                const techName = technicians?.find((t) => t.id === call.technician_id)?.full_name || "Sem técnico";
                return (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => {
                      setDaySheetOpen(false);
                      onCallClick?.(call.id);
                    }}
                    className="w-full text-left p-3 rounded-lg border bg-card cursor-pointer hover:shadow-md active:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{call.scheduled_time}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {call.status === "pending" ? "Pendente" : 
                             call.status === "in_progress" ? "Em Andamento" :
                             call.status === "completed" ? "Concluído" : call.status}
                          </span>
                        </div>
                        <p className="font-medium truncate mt-1">
                          {call.clients?.company_name || call.clients?.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {call.equipment_description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{techName}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};


export default MonthlyView;
