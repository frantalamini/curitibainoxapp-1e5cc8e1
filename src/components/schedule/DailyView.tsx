import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import ScheduleEventCard from "./ScheduleEventCard";
import { Technician } from "@/hooks/useTechnicians";
import { CalendarX } from "lucide-react";
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

interface DailyViewProps {
  currentDate: Date;
  serviceCalls: ServiceCall[];
  technicians: Technician[];
  selectedTechnicianId: string;
}

const DailyView = ({
  currentDate,
  serviceCalls,
  technicians,
  selectedTechnicianId,
}: DailyViewProps) => {
  // Filter service calls for the current day
  const dayCalls = useMemo(() => {
    const filtered = serviceCalls.filter((call) => {
      if (!isSameDay(parseLocalDate(call.scheduled_date), currentDate)) return false;

      if (selectedTechnicianId !== "all" && call.technician_id !== selectedTechnicianId) {
        return false;
      }

      return true;
    });

    // Sort by time
    filtered.sort((a, b) => {
      const timeA = a.scheduled_time || "00:00";
      const timeB = b.scheduled_time || "00:00";
      return timeA.localeCompare(timeB);
    });

    return filtered;
  }, [serviceCalls, currentDate, selectedTechnicianId]);

  if (dayCalls.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <CalendarX className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            Sem agendamentos para este dia
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Day Header */}
      <div className="px-4 py-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold capitalize">
          {format(currentDate, "EEEE", { locale: ptBR })}
        </h2>
        <p className="text-muted-foreground">
          {format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <p className="text-sm text-primary mt-1">
          {dayCalls.length} chamado{dayCalls.length !== 1 ? "s" : ""} agendado{dayCalls.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {dayCalls.map((call) => {
          const techName =
            technicians?.find((t) => t.id === call.technician_id)?.full_name ||
            "Sem técnico";

          return (
            <ScheduleEventCard
              key={call.id}
              call={call}
              technicianName={techName}
              variant="detailed"
            />
          );
        })}
      </div>
    </div>
  );
};

export default DailyView;
