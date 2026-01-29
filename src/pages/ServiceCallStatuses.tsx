import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Wrench, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMobileCard } from "@/components/mobile/StatusMobileCard";
import { ActiveBadge } from "@/components/ui/status-badge";

const ServiceCallStatuses = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { statuses, isLoading, deleteStatus } = useServiceCallStatuses();
  const { isAdmin } = useUserRole();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteStatus(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader 
          title="Status de Chamado" 
          actionLabel={isAdmin ? "Novo Status" : undefined}
          onAction={isAdmin ? () => navigate("/service-call-statuses/new") : undefined}
        />

        {!statuses || statuses.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum status cadastrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {statuses.map((status) => (
              <StatusMobileCard
                key={status.id}
                status={status}
                onEdit={() => navigate(`/service-call-statuses/${status.id}/edit`)}
                onDelete={() => setDeleteId(status.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ativo</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm">{status.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {status.status_type === 'tecnico' ? (
                        <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                          <Wrench className="h-3.5 w-3.5" />
                          Status Técnico
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/80 border-accent/20">
                          <Briefcase className="h-3.5 w-3.5" />
                          Situação Comercial
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{status.color}</span>
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={status.active} />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/service-call-statuses/${status.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(status.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este status? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ServiceCallStatuses;
