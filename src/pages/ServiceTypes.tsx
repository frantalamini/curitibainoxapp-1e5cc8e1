import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
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
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceTypeMobileCard } from "@/components/mobile/ServiceTypeMobileCard";
import { ActiveBadge } from "@/components/ui/status-badge";

const ServiceTypes = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { serviceTypes, isLoading, deleteServiceType } = useServiceTypes();
  const { isAdmin } = useUserRole();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteServiceType(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader 
          title="Tipos de Serviço" 
          actionLabel={isAdmin ? "Novo Tipo" : undefined}
          onAction={isAdmin ? () => navigate("/service-types/new") : undefined}
        />

        {!serviceTypes || serviceTypes.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum tipo de serviço cadastrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {serviceTypes.map((type) => (
              <ServiceTypeMobileCard
                key={type.id}
                serviceType={type}
                onEdit={() => navigate(`/service-types/${type.id}/edit`)}
                onDelete={() => setDeleteId(type.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {type.color}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={type.active} />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/service-types/${type.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(type.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
              Tem certeza que deseja excluir este tipo de serviço? Esta ação não pode ser desfeita.
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

export default ServiceTypes;
