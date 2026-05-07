import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useNewServiceCallsCount } from "@/hooks/useNewServiceCallsCount";
import { useServiceCallMarkers } from "@/hooks/useServiceCallMarkers";
import { useCommercialStatusCounts } from "@/hooks/useCommercialStatusCounts";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useCurrentUserPermissions,
  checkPermission,
} from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { ServiceCallMobileCard } from "@/components/mobile/ServiceCallMobileCard";
import { ServiceCallsTable } from "@/components/ServiceCallsTable";
import { CadastrosPagination } from "@/components/CadastrosPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { CalendarDays, X } from "lucide-react";

const PAGE_SIZE = 30;
const FILTERS_STORAGE_KEY = "sc-filters";

// Persistir/recuperar filtros em sessionStorage
function saveFilters(filters: Record<string, string>) {
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

function loadFilters(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const ServiceCalls = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { statuses } = useServiceCallStatuses();
  const { technicianId } = useCurrentTechnician();
  const { data: newCallsCount = 0 } = useNewServiceCallsCount();
  const { data: commercialCounts } = useCommercialStatusCounts();
  const { isAdmin } = useUserRole();
  const { data: currentUserPerms } = useCurrentUserPermissions();
  const canViewFinancial = checkPermission(
    currentUserPerms?.permissions ?? [],
    "finances",
    "view",
  );

  const technicalStatuses =
    statuses?.filter((s) => s.status_type === "tecnico") || [];
  const commercialStatuses =
    statuses?.filter((s) => s.status_type === "comercial" && s.active) || [];

  // Carregar filtros salvos do sessionStorage
  const saved = useMemo(() => loadFilters(), []);

  const [searchTerm, setSearchTerm] = useState(saved.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState<string>(
    saved.statusFilter || "all",
  );
  const [commercialTab, setCommercialTab] = useState<string>(
    saved.commercialTab || "all",
  );
  const [activeTab, setActiveTab] = useState<"todos" | "novos">(
    (saved.activeTab as "todos" | "novos") || "todos",
  );
  const [currentPage, setCurrentPage] = useState(
    Number(saved.currentPage) || 1,
  );
  const [dateFrom, setDateFrom] = useState(saved.dateFrom || "");
  const [dateTo, setDateTo] = useState(saved.dateTo || "");
  const [showDateFilter, setShowDateFilter] = useState(
    !!(saved.dateFrom || saved.dateTo),
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Salvar filtros sempre que mudarem
  useEffect(() => {
    saveFilters({
      searchTerm,
      statusFilter,
      commercialTab,
      activeTab,
      currentPage: String(currentPage),
      dateFrom,
      dateTo,
    });
  }, [
    searchTerm,
    statusFilter,
    commercialTab,
    activeTab,
    currentPage,
    dateFrom,
    dateTo,
  ]);

  const { serviceCalls, isLoading, totalCount } = useServiceCalls(
    currentPage,
    PAGE_SIZE,
    {
      searchTerm: debouncedSearchTerm,
      statusId: statusFilter === "all" ? undefined : statusFilter,
      commercialStatusId: commercialTab === "all" ? undefined : commercialTab,
      onlyNewForTechnicianId: activeTab === "novos" ? technicianId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
  );

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    statusFilter,
    commercialTab,
    activeTab,
    technicianId,
    dateFrom,
    dateTo,
  ]);

  // Ordenação já vem do banco via order("os_number", { ascending: false })
  const sortedCalls = serviceCalls || [];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Hook de marcadores para mobile
  const mobileServiceCallIds = useMemo(
    () => sortedCalls.map((c) => c.id),
    [sortedCalls],
  );
  const {
    markersByServiceCall,
    isLoading: markersLoading,
    addMarker,
    removeMarker,
  } = useServiceCallMarkers(mobileServiceCallIds);

  const handleAddMarker = async (serviceCallId: string, text: string) => {
    await addMarker.mutateAsync({ serviceCallId, text });
  };

  const handleRemoveMarker = async (markerId: string) => {
    await removeMarker.mutateAsync(markerId);
  };

  // Query de totais financeiros (apenas para admin)
  const serviceCallIds = useMemo(
    () => sortedCalls.map((c) => c.id),
    [sortedCalls],
  );
  const { data: totalsByServiceCallId = {} } = useQuery({
    queryKey: ["service-call-totals", serviceCallIds],
    queryFn: async () => {
      if (serviceCallIds.length === 0) return {};
      const { data, error } = await supabase
        .from("service_call_items")
        .select("service_call_id, total")
        .in("service_call_id", serviceCallIds);
      if (error) throw error;
      return (data || []).reduce(
        (acc, item) => {
          acc[item.service_call_id] =
            (acc[item.service_call_id] || 0) + Number(item.total);
          return acc;
        },
        {} as Record<string, number>,
      );
    },
    enabled: canViewFinancial && serviceCallIds.length > 0,
  });

  // Abas comerciais dinâmicas
  const commercialTabs = useMemo(() => {
    const tabs = [
      { value: "all", label: "Todas", count: commercialCounts?.all ?? 0 },
    ];
    commercialStatuses
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .forEach((s) => {
        tabs.push({
          value: s.id,
          label: s.name,
          count: commercialCounts?.[s.id] ?? 0,
        });
      });
    return tabs;
  }, [commercialStatuses, commercialCounts]);

  const clearDateFilter = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setShowDateFilter(false);
  }, []);

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    commercialTab !== "all" ||
    dateFrom ||
    dateTo;

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <PageHeader
          title="Chamados Técnicos"
          actionLabel="Novo Chamado"
          onAction={() => navigate("/service-calls/new")}
        />

        {/* Abas por Status Comercial — Desktop: tabs horizontais / Mobile: dropdown */}
        <div>
          {/* Desktop */}
          <Tabs
            value={commercialTab}
            onValueChange={setCommercialTab}
            className="hidden md:block"
          >
            <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 w-full justify-start overflow-x-auto">
              {commercialTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                >
                  <span className="font-medium text-sm whitespace-nowrap">
                    {tab.label}{" "}
                    <span className="text-xs text-muted-foreground ml-1">
                      {tab.count}
                    </span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Mobile */}
          <div className="md:hidden">
            <Select value={commercialTab} onValueChange={setCommercialTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {commercialTabs.find((t) => t.value === commercialTab)?.label}{" "}
                  (
                  {commercialTabs.find((t) => t.value === commercialTab)?.count}
                  )
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {commercialTabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label} ({tab.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por cliente, OS ou técnico..."
            className="md:flex-1"
          />
          <div className="flex gap-2">
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
            <Button
              type="button"
              variant={showDateFilter ? "default" : "outline"}
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => {
                if (showDateFilter) {
                  clearDateFilter();
                } else {
                  setShowDateFilter(true);
                }
              }}
              title="Filtrar por data"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filtro de data */}
        {showDateFilter && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Período:
            </span>
            <div className="flex gap-2 flex-1">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 flex-1"
                placeholder="De"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 flex-1"
                placeholder="Até"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDateFilter}
              className="shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        )}

        {/* Tabs Todos | Novos (apenas para técnicos) */}
        {technicianId && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "todos" | "novos")}
            className="w-full"
          >
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
              <TabsTrigger value="todos" className="flex-1 sm:flex-none">
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="novos"
                className="flex-1 sm:flex-none relative"
              >
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
              {hasActiveFilters
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
                showTotal={canViewFinancial}
                totalsByServiceCallId={totalsByServiceCallId}
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
                  showTotal={canViewFinancial}
                  totalValue={totalsByServiceCallId[call.id]}
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
