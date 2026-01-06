import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { useIsMobile } from "@/hooks/use-mobile";
import { ServiceCallMobileCard } from "@/components/mobile/ServiceCallMobileCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ServiceCall } from "@/hooks/useServiceCalls";

const ServiceCallViewDialog = lazy(() => import("@/components/ServiceCallViewDialog"));

const ServiceCalls = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const { serviceCalls, isLoading, deleteServiceCall, updateServiceCall } = useServiceCalls();
  const { statuses } = useServiceCallStatuses();
  
  const technicalStatuses = statuses?.filter(s => s.status_type === 'tecnico') || [];
  const commercialStatuses = statuses?.filter(s => s.status_type === 'comercial') || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ServiceCall | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteServiceCall(deleteId);
      setDeleteId(null);
    }
  };

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
                onView={() => {
                  setSelectedCall(call);
                  setViewDialogOpen(true);
                }}
                onEdit={() => navigate(`/service-calls/edit/${call.id}`)}
                onDelete={() => setDeleteId(call.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Nº OS</TableHead>
                  <TableHead className="w-32">Data/Hora</TableHead>
                  <TableHead className="w-48">Cliente</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead className="w-40">Tipo de Chamado</TableHead>
                  <TableHead className="w-36">Técnico</TableHead>
                  <TableHead className="w-40">Status Técnico</TableHead>
                  <TableHead className="w-40">Status Comercial</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <span className="font-mono text-lg font-semibold">
                        {call.os_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {call.scheduled_time}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{call.clients?.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.clients?.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{call.equipment_description}</TableCell>
                    <TableCell>
                      {call.service_types ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: call.service_types.color }}
                          />
                          <span className="text-sm">
                            {call.service_types.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{call.technicians?.full_name}</TableCell>
                    <TableCell>
                      <Select
                        value={call.status_id || ""}
                        onValueChange={(value) => {
                          if (value && value !== "") {
                            updateServiceCall({ id: call.id, status_id: value });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecionar">
                            {call.service_call_statuses && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: call.service_call_statuses.color }}
                                />
                                <span className="text-sm">
                                  {call.service_call_statuses.name}
                                </span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {technicalStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="text-sm">{status.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.commercial_status_id || ""}
                        onValueChange={(value) => {
                          if (value && value !== "") {
                            updateServiceCall({ id: call.id, commercial_status_id: value });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecionar">
                            {call.commercial_status && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: call.commercial_status.color }}
                                />
                                <span className="text-sm">
                                  {call.commercial_status.name}
                                </span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {commercialStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="text-sm">{status.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCall(call);
                            setViewDialogOpen(true);
                          }}
                          title="Visualizar chamado"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/service-calls/edit/${call.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este chamado técnico? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteServiceCall(call.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Dialog for Mobile */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este chamado técnico? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCall && (
        <Suspense fallback={<div className="fixed inset-0 bg-background/80 flex items-center justify-center"><div className="animate-pulse">Carregando...</div></div>}>
          <ServiceCallViewDialog
            call={selectedCall}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
          />
        </Suspense>
      )}
    </MainLayout>
  );
};

export default ServiceCalls;
