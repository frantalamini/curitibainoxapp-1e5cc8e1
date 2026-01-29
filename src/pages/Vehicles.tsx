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
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { useVehicles, VehicleStatus } from "@/hooks/useVehicles";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/ui/page-header";
import { VehicleMobileCard } from "@/components/mobile/VehicleMobileCard";

const Vehicles = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { vehicles, isLoading, deleteVehicle } = useVehicles();
  const { isAdmin } = useUserRole();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteVehicle(deleteId);
      setDeleteId(null);
    }
  };

  const formatOdometer = (km: number | null) => {
    if (!km) return "-";
    return new Intl.NumberFormat('pt-BR').format(km) + " km";
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const variants: Record<VehicleStatus, { label: string; className: string }> = {
      ativo: { label: "Ativo", className: "bg-success text-success-foreground" },
      inativo: { label: "Inativo", className: "bg-destructive text-destructive-foreground" },
      em_manutencao: { label: "Em Manutenção", className: "bg-warning text-warning-foreground" },
    };
    const config = variants[status];
    return <Badge className={config.className}>{config.label}</Badge>;
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
          title="Veículos" 
          actionLabel={isAdmin ? "Novo Veículo" : undefined}
          onAction={isAdmin ? () => navigate("/vehicles/new") : undefined}
        />

        {!vehicles || vehicles.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum veículo cadastrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <VehicleMobileCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                onDelete={() => setDeleteId(vehicle.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] max-w-[120px]">Nome</TableHead>
                  <TableHead className="w-20">Marca</TableHead>
                  <TableHead className="w-20">Placa</TableHead>
                  <TableHead className="w-28">RENAVAM</TableHead>
                  <TableHead className="w-24">Km</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  {isAdmin && <TableHead className="text-right w-20">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium text-sm">{vehicle.name}</TableCell>
                    <TableCell className="text-sm">{vehicle.brand || "-"}</TableCell>
                    <TableCell className="text-sm">{vehicle.plate}</TableCell>
                    <TableCell className="text-sm">{vehicle.renavam || "-"}</TableCell>
                    <TableCell className="text-sm">{formatOdometer(vehicle.current_odometer_km)}</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteId(vehicle.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
              Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
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

export default Vehicles;
