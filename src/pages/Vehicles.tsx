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
import { Pencil, Trash2, Plus } from "lucide-react";
import { useVehicles, VehicleStatus } from "@/hooks/useVehicles";
import { useUserRole } from "@/hooks/useUserRole";

const Vehicles = () => {
  const navigate = useNavigate();
  const { vehicles, isLoading, deleteVehicle } = useVehicles();
  const { isAdmin } = useUserRole();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteVehicle(deleteId);
      setDeleteId(null);
    }
  };

  const formatOdometer = (km: number) => {
    return new Intl.NumberFormat('pt-BR').format(km) + " km";
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const variants: Record<VehicleStatus, { label: string; className: string }> = {
      ativo: { label: "Ativo", className: "bg-green-500 text-white" },
      inativo: { label: "Inativo", className: "bg-red-500 text-white" },
      em_manutencao: { label: "Em Manutenção", className: "bg-yellow-500 text-white" },
    };
    const config = variants[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8">
          <p>Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Veículos</h1>
          {isAdmin && (
            <Button onClick={() => navigate("/vehicles/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Veículo
            </Button>
          )}
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>RENAVAM</TableHead>
                    <TableHead>Quilometragem</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.name}</TableCell>
                  <TableCell>{vehicle.brand || "-"}</TableCell>
                  <TableCell>{vehicle.plate}</TableCell>
                  <TableCell>{vehicle.renavam || "-"}</TableCell>
                  <TableCell>{formatOdometer(vehicle.current_odometer_km)}</TableCell>
                  <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(vehicle.id)}
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
