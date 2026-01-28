import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useNewServiceCallsCount } from "@/hooks/useNewServiceCallsCount";
import { ServiceCallMobileCard } from "@/components/mobile/ServiceCallMobileCard";
import { parseLocalDate } from "@/lib/dateUtils";

const ServiceCalls = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const { serviceCalls, isLoading } = useServiceCalls();
  const { statuses } = useServiceCallStatuses();
  const { technicianId } = useCurrentTechnician();
  const { data: newCallsCount = 0 } = useNewServiceCallsCount();
  
  const technicalStatuses = statuses?.filter(s => s.status_type === 'tecnico') || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"todos" | "novos">("todos");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  const filteredCalls = serviceCalls?.filter((call) => {
    const matchesSearch = 
      call.clients?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.equipment_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.technicians?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(call.os_number).includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || call.status_id === statusFilter;
    
    // Filtro por aba "Novos" - apenas chamados não vistos do técnico logado
    const matchesTab = activeTab === "todos" || 
      (activeTab === "novos" && call.technician_id === technicianId && !call.seen_by_tech_at);
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  // Ordenação por os_number DESC (numérico) com fallback created_at DESC
  const sortedCalls = [...(filteredCalls || [])].sort((a, b) => {
    const nA = Number(a.os_number) || 0;
    const nB = Number(b.os_number) || 0;
    if (nA !== nB) return nB - nA;
    const cA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return cB - cA;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    try {
      return format(parseLocalDate(dateStr), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(`/service-calls/${id}`);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6 min-w-0">
        <PageHeader 
          title="Chamados Técnicos" 
          actionLabel="Novo Chamado"
          onAction={() => navigate("/service-calls/new")}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por cliente, OS ou técnico..."
            className="md:flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {technicalStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs Todos | Novos */}
        {technicianId && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "todos" | "novos")} className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="todos" className="flex-1 sm:flex-none">
                Todos
              </TabsTrigger>
              <TabsTrigger value="novos" className="flex-1 sm:flex-none relative">
                Novos
                {newCallsCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                    {newCallsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando chamados...
          </div>
        ) : !sortedCalls || sortedCalls.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            <p>Nenhum chamado técnico encontrado</p>
            <p className="text-sm mt-2">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Chamado' para criar o primeiro"}
            </p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {sortedCalls.map((call) => (
              <ServiceCallMobileCard
                key={call.id}
                call={call}
                onClick={() => navigate(`/service-calls/${call.id}`)}
              />
            ))}
          </div>
        ) : (
          /* LISTA COMPACTA DESKTOP - substitui tabela */
          <div className="border rounded-lg bg-card divide-y divide-border">
            {sortedCalls.map((call) => (
              <div
                key={call.id}
                role="button"
                tabIndex={0}
                className="p-3 hover:bg-muted/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                onClick={() => navigate(`/service-calls/${call.id}`)}
                onKeyDown={(e) => handleRowKeyDown(e as unknown as React.KeyboardEvent<HTMLTableRowElement>, call.id)}
              >
                {/* Grid responsivo: 1 linha em desktop, quebra em telas menores */}
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 md:grid-cols-[60px_1fr_80px_100px_auto_auto] md:items-center">
                  {/* OS Number */}
                  <div className="font-mono text-sm font-semibold text-primary">
                    #{call.os_number}
                  </div>
                  
                  {/* Cliente - ocupa espaço restante na primeira linha mobile */}
                  <div className="min-w-0 md:col-span-1">
                    <div className="font-medium text-sm truncate">{call.clients?.full_name || "-"}</div>
                    <div className="text-xs text-muted-foreground truncate">{call.clients?.phone || "-"}</div>
                  </div>
                  
                  {/* Data */}
                  <div className="text-sm text-muted-foreground col-start-2 md:col-start-auto">
                    {formatDate(call.scheduled_date)}
                  </div>
                  
                  {/* Técnico */}
                  <div className="text-sm truncate">
                    {call.technicians?.full_name?.split(' ')[0] || "-"}
                  </div>
                  
                  {/* Status Técnico */}
                  {call.service_call_statuses ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 w-fit">
                      <div
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: call.service_call_statuses.color }}
                      />
                      <span className="text-xs truncate max-w-[100px]">{call.service_call_statuses.name}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">-</div>
                  )}
                  
                  {/* Status Comercial */}
                  {call.commercial_status ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 w-fit">
                      <div
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: call.commercial_status.color }}
                      />
                      <span className="text-xs truncate max-w-[100px]">{call.commercial_status.name}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">-</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceCalls;
