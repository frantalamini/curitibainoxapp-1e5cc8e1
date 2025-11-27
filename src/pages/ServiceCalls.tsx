import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { useServiceCalls } from "@/hooks/useServiceCalls";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceCallViewDialog from "@/components/ServiceCallViewDialog";
import type { ServiceCall } from "@/hooks/useServiceCalls";

const ServiceCalls = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { serviceCalls, isLoading, deleteServiceCall, updateServiceCall } = useServiceCalls();
  const { statuses } = useServiceCallStatuses();
  
  // Filtrar statuses por tipo
  const technicalStatuses = statuses?.filter(s => s.status_type === 'tecnico') || [];
  const commercialStatuses = statuses?.filter(s => s.status_type === 'comercial') || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ServiceCall | null>(null);

  // Auto-filter based on URL query params
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
      call.technicians?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || call.status_id === statusFilter;
    
    return matchesSearch && matchesStatus;
  });



  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Chamados Técnicos</h1>
          <Button onClick={() => navigate("/service-calls/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, equipamento ou técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
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
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Nenhum chamado técnico encontrado</p>
            <p className="text-sm mt-2">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Clique em 'Novo Chamado' para criar o primeiro"}
            </p>
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
                    onValueChange={(value) => updateServiceCall({ id: call.id, status_id: value })}
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
                    onValueChange={(value) => updateServiceCall({ id: call.id, commercial_status_id: value })}
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

      {selectedCall && (
        <ServiceCallViewDialog
          call={selectedCall}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
        />
      )}
    </MainLayout>
  );
};

export default ServiceCalls;
