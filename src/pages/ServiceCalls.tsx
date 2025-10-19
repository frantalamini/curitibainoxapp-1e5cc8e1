import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ServiceCalls = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { serviceCalls, isLoading, deleteServiceCall, updateServiceCall } = useServiceCalls();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Auto-filter based on URL query params
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Aguardando Início", variant: "secondary" as const },
      in_progress: { label: "Em Andamento", variant: "default" as const },
      on_hold: { label: "Com Pendências", variant: "outline" as const },
      completed: { label: "Finalizado", variant: "outline" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const getUrgencyBadge = (urgency: string) => {
    return urgency === "corrective" 
      ? { label: "Corretiva", variant: "destructive" as const }
      : { label: "Preventiva", variant: "secondary" as const };
  };

  const filteredCalls = serviceCalls?.filter((call) => {
    const matchesSearch = 
      call.clients?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.equipment_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.technicians?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || call.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (callId: string, newStatus: string) => {
    updateServiceCall({ id: callId, status: newStatus as any });
  };

  const handleExecuteTask = (callId: string) => {
    updateServiceCall({ 
      id: callId, 
      status: "in_progress",
      started_at: new Date().toISOString()
    });
  };

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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Aguardando Início</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="on_hold">Com Pendências</SelectItem>
              <SelectItem value="completed">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow key={call.id}>
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
                      <Badge variant={getUrgencyBadge(call.urgency).variant}>
                        {getUrgencyBadge(call.urgency).label}
                      </Badge>
                    </TableCell>
                    <TableCell>{call.technicians?.full_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {call.scheduled_time}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.status}
                        onValueChange={(value) => handleStatusChange(call.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <Badge variant={getStatusBadge(call.status).variant}>
                            {getStatusBadge(call.status).label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Aguardando Início</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="on_hold">Com Pendências</SelectItem>
                          <SelectItem value="completed">Finalizado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {call.status === 'pending' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleExecuteTask(call.id)}
                        title="Iniciar atendimento"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Executar
                      </Button>
                    )}
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
    </MainLayout>
  );
};

export default ServiceCalls;
