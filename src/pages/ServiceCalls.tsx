import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
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

const ServiceCalls = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const { serviceCalls, isLoading, updateServiceCall } = useServiceCalls();
  const { statuses } = useServiceCallStatuses();
  const { technicianId } = useCurrentTechnician();
  const { data: newCallsCount = 0 } = useNewServiceCallsCount();
  
  const technicalStatuses = statuses?.filter(s => s.status_type === 'tecnico') || [];
  const commercialStatuses = statuses?.filter(s => s.status_type === 'comercial') || [];
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

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
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
        ) : !filteredCalls || filteredCalls.length === 0 ? (
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
            {filteredCalls.map((call) => (
              <ServiceCallMobileCard
                key={call.id}
                call={call}
                onClick={() => navigate(`/service-calls/edit/${call.id}`)}
              />
            ))}
          </div>
        ) : (
        <div className="w-full max-w-full overflow-x-auto min-w-0 border rounded-lg">
            <div style={{ minWidth: '640px' }}>
              <table 
                className="w-full text-sm border-collapse"
                style={{ tableLayout: 'fixed' }}
              >
                <colgroup>
                  <col style={{ width: '60px' }} />
                  <col style={{ minWidth: '140px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '60px' }} />
                </colgroup>
              <thead className="bg-muted/50">
                <tr>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">Nº OS</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">Cliente</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">Técnico</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">St. Técnico</th>
                  <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">St. Comercial</th>
                  <th 
                    className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs"
                    style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 10 }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr 
                      key={call.id} 
                      className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/service-calls/edit/${call.id}`)}
                    >
                      <td className="px-2 py-2 align-top whitespace-normal break-words leading-snug">
                        <Link
                          to={`/service-calls/edit/${call.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {call.os_number}
                        </Link>
                      </td>
                      <td className="px-2 py-2 align-top whitespace-normal break-words leading-snug max-w-[220px]">
                        <div className="font-medium text-sm break-words" title={call.clients?.full_name}>
                          {call.clients?.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground break-words">
                          {call.clients?.phone}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top whitespace-normal break-words leading-snug">
                        <span className="break-words text-sm" title={call.technicians?.full_name}>
                          {call.technicians?.full_name?.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top whitespace-normal break-words leading-snug max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={call.status_id || ""}
                          onValueChange={(value) => {
                            if (value && value !== "") {
                              updateServiceCall({ id: call.id, status_id: value });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-xs min-w-0">
                            <SelectValue placeholder="Selecionar">
                              {call.service_call_statuses && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <div
                                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: call.service_call_statuses.color }}
                                  />
                                  <span className="text-xs break-words min-w-0">
                                    {call.service_call_statuses.name}
                                  </span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {technicalStatuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <span className="text-sm">{status.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2 align-top whitespace-normal break-words leading-snug max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={call.commercial_status_id || ""}
                          onValueChange={(value) => {
                            if (value && value !== "") {
                              updateServiceCall({ id: call.id, commercial_status_id: value });
                            }
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-xs min-w-0">
                            <SelectValue placeholder="Selecionar">
                              {call.commercial_status && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <div
                                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: call.commercial_status.color }}
                                  />
                                  <span className="text-xs break-words min-w-0">
                                    {call.commercial_status.name}
                                  </span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {commercialStatuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-1">
                                  <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <span className="text-sm">{status.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td 
                        className="px-2 py-2 align-top"
                        style={{ position: 'sticky', right: 0, backgroundColor: 'white', zIndex: 10 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          to={`/service-calls/edit/${call.id}`}
                          className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceCalls;
