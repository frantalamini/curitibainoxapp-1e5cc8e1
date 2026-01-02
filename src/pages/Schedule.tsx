import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useTechnicians } from "@/hooks/useTechnicians";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Plus, CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import ScheduleViewSelector, { ViewMode } from "@/components/schedule/ScheduleViewSelector";
import MonthlyView from "@/components/schedule/MonthlyView";
import WeeklyView from "@/components/schedule/WeeklyView";
import DailyView from "@/components/schedule/DailyView";

const Schedule = () => {
  const navigate = useNavigate();
  const { serviceCalls, isLoading: isLoadingCalls } = useServiceCalls();
  const { technicians, isLoading: isLoadingTechs } = useTechnicians();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setDatePickerOpen(false);
    }
  };

  const activeTechnicians = technicians?.filter((t) => t.active) || [];

  // Navigation handlers based on view mode
  const handlePrevious = () => {
    switch (viewMode) {
      case "monthly":
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case "weekly":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "daily":
        setCurrentDate(subDays(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case "monthly":
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case "weekly":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "daily":
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format the navigation title based on view mode
  const getNavigationTitle = () => {
    switch (viewMode) {
      case "monthly":
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      case "weekly": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}`;
      }
      case "daily":
        return format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
    }
  };

  // Get description text
  const getSubtitle = () => {
    switch (viewMode) {
      case "monthly":
        return "Calendário mensal de chamados técnicos";
      case "weekly":
        return "Visualização semanal de chamados";
      case "daily":
        return "Visualização diária de chamados";
    }
  };

  if (isLoadingCalls || isLoadingTechs) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">Agenda Técnica</h1>
              <p className="text-sm text-muted-foreground truncate">{getSubtitle()}</p>
            </div>
            <Button onClick={() => navigate("/service-calls/new")} className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Chamado
            </Button>
          </div>

          {/* View Selector */}
          <div className="flex justify-center sm:justify-start">
            <ScheduleViewSelector value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-lg border">
          {/* Navigation Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Arrows + Title */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                className="shrink-0 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm sm:text-base font-semibold text-center capitalize truncate flex-1 min-w-0 px-1">
                {getNavigationTitle()}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="shrink-0 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date Picker + Today Button */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title="Selecionar data"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={handleDateSelect}
                    defaultMonth={currentDate}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className={`text-xs h-8 px-2 sm:px-3 ${isToday(currentDate) ? "opacity-50" : ""}`}
                disabled={isToday(currentDate)}
              >
                Hoje
              </Button>
            </div>
          </div>

          {/* Filter Row */}
          <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {activeTechnicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Content */}
        {viewMode === "monthly" && (
          <MonthlyView
            currentDate={currentDate}
            serviceCalls={serviceCalls || []}
            technicians={technicians || []}
            selectedTechnicianId={selectedTechnicianId}
          />
        )}
        {viewMode === "weekly" && (
          <WeeklyView
            currentDate={currentDate}
            serviceCalls={serviceCalls || []}
            technicians={technicians || []}
            selectedTechnicianId={selectedTechnicianId}
          />
        )}
        {viewMode === "daily" && (
          <DailyView
            currentDate={currentDate}
            serviceCalls={serviceCalls || []}
            technicians={technicians || []}
            selectedTechnicianId={selectedTechnicianId}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Schedule;
