import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Clock, CheckCircle, XCircle, DollarSign, Eye, Filter } from "lucide-react";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useTechnicianReimbursements, ReimbursementStatus } from "@/hooks/useTechnicianReimbursements";
import { TechnicianReimbursementModal } from "@/components/reimbursements/TechnicianReimbursementModal";
import { AdminReimbursementModal } from "@/components/reimbursements/AdminReimbursementModal";
import { ReimbursementDetailsDialog } from "@/components/reimbursements/ReimbursementDetailsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  PENDING: { label: "Pendente", variant: "secondary", icon: Clock },
  APPROVED: { label: "Aprovado", variant: "default", icon: CheckCircle },
  PAID: { label: "Pago", variant: "default", icon: DollarSign },
  REJECTED: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

type StatusFilter = ReimbursementStatus | "all";

export default function TechnicianReimbursements() {
  const { technicianId, isLoading: isLoadingTechnician } = useCurrentTechnician();
  const { isAdmin, loading: isLoadingRole } = useUserRole();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  const { reimbursements, isLoading: isLoadingReimbursements, summary } = useTechnicianReimbursements(
    isAdmin 
      ? (statusFilter !== "all" ? { status: statusFilter } : undefined)
      : (technicianId ? { technicianId, ...(statusFilter !== "all" ? { status: statusFilter } : {}) } : undefined)
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<string | null>(null);

  const isLoading = isLoadingTechnician || isLoadingReimbursements || isLoadingRole;

  if (!isLoadingTechnician && !isLoadingRole && !technicianId && !isAdmin) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8 py-6 space-y-6">
          <PageHeader title="Reembolsos" />
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Esta funcionalidade está disponível apenas para técnicos e administradores.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isTechnician = !!technicianId;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "PENDING", label: "Pendentes" },
    { value: "APPROVED", label: "Aprovados" },
    { value: "PAID", label: "Pagos" },
    { value: "REJECTED", label: "Rejeitados" },
  ];

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8 py-6 space-y-6">
        <PageHeader title={isAdmin ? "Gestão de Reembolsos" : "Meus Reembolsos"}>
          {isAdmin ? (
            <Button onClick={() => setIsAdminModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Reembolso
            </Button>
          ) : isTechnician ? (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          ) : null}
        </PageHeader>
        
        <p className="text-muted-foreground -mt-4">
          {isAdmin 
            ? "Visualize e gerencie todos os pedidos de reembolso dos técnicos"
            : "Solicite reembolso de despesas vinculadas às suas OS"
          }
        </p>

        {/* Dashboard Summary Cards */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="py-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-sm text-muted-foreground">Pendentes</div>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</div>
                <div className="text-xs text-muted-foreground">{summary.countPending} solicitação(ões)</div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="py-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-sm text-muted-foreground">Aprovados (aguardando pagamento)</div>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalApproved)}</div>
                <div className="text-xs text-muted-foreground">{summary.countApproved} solicitação(ões)</div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="py-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-sm text-muted-foreground">Pagos</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
                <div className="text-xs text-muted-foreground">{summary.countPaid} solicitação(ões)</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reimbursements && reimbursements.length > 0 ? (
          <div className="space-y-3">
            {reimbursements.map((reimbursement) => {
              const status = statusConfig[reimbursement.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              
              return (
                <Card 
                  key={reimbursement.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedReimbursement(reimbursement.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-primary">
                            OS #{reimbursement.service_call?.os_number}
                          </span>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          {isAdmin && reimbursement.technician && (
                            <span className="text-xs text-muted-foreground">
                              • {reimbursement.technician.full_name}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {reimbursement.service_call?.clients?.full_name}
                        </p>
                        
                        {reimbursement.description && (
                          <p className="text-sm truncate">
                            {reimbursement.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado em {format(new Date(reimbursement.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-lg font-semibold text-primary">
                          R$ {reimbursement.amount.toFixed(2).replace(".", ",")}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReimbursement(reimbursement.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum reembolso</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin
                  ? "Nenhuma solicitação de reembolso foi registrada ainda."
                  : isTechnician
                    ? "Você ainda não solicitou nenhum reembolso."
                    : "Para cadastrar, acesse com um usuário vinculado a um técnico."
                }
              </p>
              {isAdmin ? (
                <Button onClick={() => setIsAdminModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Reembolso
                </Button>
              ) : isTechnician ? (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Reembolso
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}

        {isTechnician && technicianId && (
          <TechnicianReimbursementModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            technicianId={technicianId}
          />
        )}

        {isAdmin && (
          <AdminReimbursementModal
            open={isAdminModalOpen}
            onOpenChange={setIsAdminModalOpen}
          />
        )}

        <ReimbursementDetailsDialog
          open={!!selectedReimbursement}
          onOpenChange={(open) => !open && setSelectedReimbursement(null)}
          reimbursementId={selectedReimbursement}
        />
      </div>
    </MainLayout>
  );
}
