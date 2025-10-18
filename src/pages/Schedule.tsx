import { useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useTechnicians } from "@/hooks/useTechnicians";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Schedule = () => {
  const navigate = useNavigate();
  const { serviceCalls, isLoading: isLoadingCalls } = useServiceCalls();
  const { technicians, isLoading: isLoadingTechs } = useTechnicians();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");

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
    if (!serviceCalls) return new Map();
    
    const filtered = serviceCalls.filter(call => {
      // Filter by month
      const callDate = new Date(call.scheduled_date);
      if (!isSameMonth(callDate, currentDate)) return false;
      
      // Filter by technician
      if (selectedTechnicianId !== "all" && call.technician_id !== selectedTechnicianId) {
        return false;
      }
      
      return true;
    });

    const grouped = new Map<string, typeof filtered>();
    
    filtered.forEach(call => {
      const dateKey = format(new Date(call.scheduled_date), "yyyy-MM-dd");
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, call]);
    });
    
    // Sort calls within each day by time
    grouped.forEach((calls, date) => {
      calls.sort((a, b) => {
        const timeA = a.scheduled_time || "00:00";
        const timeB = b.scheduled_time || "00:00";
        return timeA.localeCompare(timeB);
      });
    });
    
    return grouped;
  }, [serviceCalls, currentDate, selectedTechnicianId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-yellow-500";
      case "in_progress":
        return "border-l-blue-500";
      case "completed":
        return "border-l-green-500";
      case "cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    return urgency === "corrective" 
      ? "bg-red-500 hover:bg-red-600" 
      : "bg-blue-500 hover:bg-blue-600";
  };

  const activeTechnicians = technicians?.filter((t) => t.active) || [];

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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agenda Técnica</h1>
            <p className="text-muted-foreground">Calendário mensal de chamados técnicos</p>
          </div>
          <Button onClick={() => navigate("/service-calls/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Chamado
          </Button>
        </div>

        {/* Calendar Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center capitalize">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="ml-2"
            >
              Hoje
            </Button>
          </div>

          <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Filtrar por técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {activeTechnicians.map(tech => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 auto-rows-fr min-h-[600px]">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="border-r border-b bg-muted/20" />;
              }

              const dateKey = format(day, "yyyy-MM-dd");
              const dayCalls = callsByDate.get(dateKey) || [];
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={`border-r border-b p-2 min-h-[120px] ${
                    isCurrentDay ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isCurrentDay
                        ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[200px]">
                    {dayCalls.map((call) => {
                      const techName = technicians?.find(t => t.id === call.technician_id)?.full_name || "Sem técnico";
                      
                      return (
                        <TooltipProvider key={call.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-xs p-1.5 rounded border-l-4 ${getStatusColor(call.status)} bg-muted/50 hover:bg-muted cursor-pointer transition-colors`}
                              >
                                <div className="font-medium truncate">
                                  {call.scheduled_time} - {call.clients?.company_name || call.clients?.full_name}
                                </div>
                                <div className="text-muted-foreground truncate">
                                  {call.equipment_description}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[300px]">
                              <div className="space-y-2">
                                <div>
                                  <div className="font-semibold">{call.clients?.company_name || call.clients?.full_name}</div>
                                  <div className="text-sm">{call.clients?.phone}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium">Equipamento:</div>
                                  <div className="text-sm">{call.equipment_description}</div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium">Técnico:</div>
                                  <div className="text-sm">{techName}</div>
                                </div>
                                {call.notes && (
                                  <div>
                                    <div className="text-sm font-medium">Observações:</div>
                                    <div className="text-sm">{call.notes}</div>
                                  </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <Badge 
                                    className={getUrgencyColor(call.urgency)}
                                  >
                                    {call.urgency === "corrective" ? "Corretiva" : "Preventiva"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {call.status === "pending" && "Pendente"}
                                    {call.status === "in_progress" && "Em Andamento"}
                                    {call.status === "completed" && "Concluído"}
                                    {call.status === "cancelled" && "Cancelado"}
                                  </Badge>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Schedule;
