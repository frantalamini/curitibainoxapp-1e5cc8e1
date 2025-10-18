import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEquipment } from "@/hooks/useEquipment";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const Equipment = () => {
  const navigate = useNavigate();
  const { equipment, isLoading, deleteEquipment } = useEquipment();
  const { clients } = useClients();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.full_name || "Cliente não encontrado";
  };

  const filteredEquipment = equipment?.filter((eq) =>
    eq.brand.toLowerCase().includes(search.toLowerCase()) ||
    eq.model.toLowerCase().includes(search.toLowerCase()) ||
    eq.serial_number?.includes(search) ||
    eq.imei?.includes(search)
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteEquipment.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Equipamentos</h1>
          <Button onClick={() => navigate("/equipment/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Equipamento
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo, serial ou IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div>Carregando...</div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Serial/IMEI</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum equipamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment?.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell className="font-medium">{getClientName(eq.client_id)}</TableCell>
                      <TableCell>{eq.brand}</TableCell>
                      <TableCell>{eq.model}</TableCell>
                      <TableCell>{eq.serial_number || eq.imei || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/equipment/${eq.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/equipment/${eq.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(eq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
              Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.
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

export default Equipment;
