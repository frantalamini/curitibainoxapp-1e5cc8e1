import { useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useTechnicians } from "@/hooks/useTechnicians";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, Phone, MapPin, Wrench } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const Schedule = () => {
  const { serviceCalls, isLoading: isLoadingCalls } = useServiceCalls();
  const { technicians, isLoading: isLoadingTechs } = useTechnicians();
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  // Filter service calls
  const filteredCalls = useMemo(() => {
    if (!serviceCalls) return [];

    let filtered = [...serviceCalls];

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = startOfDay(today);
          endDate = endOfDay(today);
          break;
        case "week":
          startDate = startOfDay(today);
          endDate = endOfDay(addDays(today, 7));
          break;
        case "month":
          startDate = startOfDay(today);
          endDate = endOfDay(addDays(today, 30));
          break;
        default:
          startDate = startOfDay(today);
          endDate = endOfDay(addDays(today, 365));
      }

      filtered = filtered.filter((call) => {
        const callDate = parseISO(call.scheduled_date);
        return isWithinInterval(callDate, { start: startDate, end: endDate });
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((call) => call.status === statusFilter);
    }

    // Technician filter
    if (technicianFilter !== "all") {
      filtered = filtered.filter((call) => call.technician_id === technicianFilter);
    }

    // Sort by date and time
    return filtered.sort((a, b) => {
      const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
  }, [serviceCalls, dateFilter, statusFilter, technicianFilter]);

  // Group calls by technician
  const callsByTechnician = useMemo(() => {
    const grouped = new Map<string, typeof filteredCalls>();
    
    filteredCalls.forEach((call) => {
      const techId = call.technician_id;
      if (!grouped.has(techId)) {
        grouped.set(techId, []);
      }
      grouped.get(techId)!.push(call);
    });

    return grouped;
  }, [filteredCalls]);

  const getUrgencyBadge = (urgency: string) => {
    return urgency === "corrective" ? (
      <Badge variant="destructive">Corretiva</Badge>
    ) : (
      <Badge className="bg-blue-500 text-white hover:bg-blue-600">Preventiva</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500 text-white hover:bg-yellow-600" },
      in_progress: { label: "Em Andamento", className: "bg-blue-500 text-white hover:bg-blue-600" },
      completed: { label: "Concluído", className: "bg-green-500 text-white hover:bg-green-600" },
      cancelled: { label: "Cancelado", className: "bg-gray-500 text-white hover:bg-gray-600" },
    };
    
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
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
        <div>
          <h1 className="text-3xl font-bold">Agenda Técnica</h1>
          <p className="text-muted-foreground">Visualize e gerencie a agenda dos técnicos</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Próximos 7 dias</SelectItem>
                <SelectItem value="month">Próximos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger>
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
        </div>

        {/* Technicians Schedule */}
        <div className="space-y-6">
          {activeTechnicians.map((technician) => {
            const techCalls = callsByTechnician.get(technician.id) || [];
            
            return (
              <Card key={technician.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5" />
                      <span>{technician.full_name}</span>
                      <Badge variant="outline">#{technician.technician_number}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {technician.specialty_refrigeration && (
                        <Badge variant="secondary">Refrigeração</Badge>
                      )}
                      {technician.specialty_cooking && (
                        <Badge variant="secondary">Cozinha</Badge>
                      )}
                      <Badge className="bg-primary/10 text-primary">
                        {techCalls.length} {techCalls.length === 1 ? "chamado" : "chamados"}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {techCalls.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum chamado agendado
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {techCalls.map((call) => (
                        <div
                          key={call.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex flex-wrap gap-4 justify-between items-start">
                            <div className="flex-1 space-y-2 min-w-[250px]">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(parseISO(call.scheduled_date), "dd/MM/yyyy (EEEE)", {
                                    locale: ptBR,
                                  })}
                                </span>
                                <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                                <span>{call.scheduled_time}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{call.clients?.full_name}</span>
                                {call.clients?.phone && (
                                  <>
                                    <Phone className="h-4 w-4 text-muted-foreground ml-2" />
                                    <span className="text-sm">{call.clients.phone}</span>
                                  </>
                                )}
                              </div>

                              {call.clients?.address && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {call.clients.address}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{call.equipment_description}</span>
                              </div>

                              {call.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <strong>Obs:</strong> {call.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {getUrgencyBadge(call.urgency)}
                              {getStatusBadge(call.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {activeTechnicians.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Nenhum técnico ativo cadastrado
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Schedule;
