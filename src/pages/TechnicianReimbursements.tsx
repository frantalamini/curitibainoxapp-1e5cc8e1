import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Clock, CheckCircle, XCircle, DollarSign, Eye } from "lucide-react";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useTechnicianReimbursements } from "@/hooks/useTechnicianReimbursements";
import { TechnicianReimbursementModal } from "@/components/reimbursements/TechnicianReimbursementModal";
import { ReimbursementDetailsDialog } from "@/components/reimbursements/ReimbursementDetailsDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  PENDING: { label: "Pendente", variant: "secondary", icon: Clock },
  APPROVED: { label: "Aprovado", variant: "default", icon: CheckCircle },
  PAID: { label: "Pago", variant: "default", icon: DollarSign },
  REJECTED: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

export default function TechnicianReimbursements() {
  const { technicianId, isLoading: isLoadingTechnician } = useCurrentTechnician();
  const { reimbursements, isLoading: isLoadingReimbursements } = useTechnicianReimbursements(
    technicianId ? { technicianId } : undefined
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<string | null>(null);

  const isLoading = isLoadingTechnician || isLoadingReimbursements;

  if (!isLoadingTechnician && !technicianId) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Reembolsos" />
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Esta funcionalidade está disponível apenas para técnicos.
              </p>
            </CardContent>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Meus Reembolsos">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        </PageHeader>
        
        <p className="text-muted-foreground mb-6 -mt-2">
          Solicite reembolso de despesas vinculadas às suas OS
        </p>

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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-primary">
                            OS #{reimbursement.service_call?.os_number}
                          </span>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
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
                Você ainda não solicitou nenhum reembolso.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Solicitar Reembolso
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal para nova solicitação */}
        {technicianId && (
          <TechnicianReimbursementModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            technicianId={technicianId}
          />
        )}

        {/* Dialog para ver detalhes */}
        <ReimbursementDetailsDialog
          open={!!selectedReimbursement}
          onOpenChange={(open) => !open && setSelectedReimbursement(null)}
          reimbursementId={selectedReimbursement}
        />
      </PageContainer>
    </MainLayout>
  );
}
