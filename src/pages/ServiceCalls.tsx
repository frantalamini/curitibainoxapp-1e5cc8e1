import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
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
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useNewServiceCallsCount } from "@/hooks/useNewServiceCallsCount";
import { useServiceCallMarkers } from "@/hooks/useServiceCallMarkers";
import { ServiceCallMobileCard } from "@/components/mobile/ServiceCallMobileCard";
import { ServiceCallsTable } from "@/components/ServiceCallsTable";
import { CadastrosPagination } from "@/components/CadastrosPagination";
import { useDebounce } from "@/hooks/useDebounce";

const PAGE_SIZE = 30;

const ServiceCalls = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { statuses } = useServiceCallStatuses();
  const { technicianId } = useCurrentTechnician();
  const { data: newCallsCount = 0 } = useNewServiceCallsCount();
  
  const technicalStatuses = statuses?.filter(s => s.status_type === 'tecnico') || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"todos" | "novos">("todos");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Debounce do termo de busca para não fazer muitas requisições
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Busca com paginação server-side
  const { serviceCalls, isLoading, totalCount } = useServiceCalls(currentPage, PAGE_SIZE, {
    searchTerm: debouncedSearchTerm,
    statusId: statusFilter === "all" ? undefined : statusFilter,
    onlyNewForTechnicianId: activeTab === "novos" ? technicianId : undefined,
  });

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, activeTab, technicianId]);

  // Ordenação por os_number DESC
  const sortedCalls = [...(serviceCalls || [])].sort((a, b) => {
    const nA = Number(a.os_number) || 0;
    const nB = Number(b.os_number) || 0;
    if (nA !== nB) return nB - nA;
    const cA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return cB - cA;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Hook de marcadores para mobile
  const mobileServiceCallIds = useMemo(() => sortedCalls.map(c => c.id), [sortedCalls]);
  const { 
    markersByServiceCall, 
    isLoading: markersLoading, 
    addMarker, 
    removeMarker 
  } = useServiceCallMarkers(mobileServiceCallIds);

  const handleAddMarker = async (serviceCallId: string, text: string) => {
    await addMarker.mutateAsync({ serviceCallId, text });
  };

  const handleRemoveMarker = async (markerId: string) => {
    await removeMarker.mutateAsync(markerId);
  };

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
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
        ) : (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden md:block">
              <ServiceCallsTable
                calls={sortedCalls}
                onRowClick={(id) => navigate(`/service-calls/${id}`)}
              />
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {sortedCalls.map((call) => (
                <ServiceCallMobileCard
                  key={call.id}
                  call={call}
                  onClick={() => navigate(`/service-calls/${call.id}`)}
                  markers={markersByServiceCall[call.id] || []}
                  onAddMarker={handleAddMarker}
                  onRemoveMarker={handleRemoveMarker}
                  isLoadingMarkers={markersLoading}
                />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <CadastrosPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceCalls;
