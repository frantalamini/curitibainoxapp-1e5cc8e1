import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEquipment } from "@/hooks/useEquipment";
import { useClients } from "@/hooks/useClients";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Pencil, Trash2, Eye } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { EquipmentMobileCard } from "@/components/mobile/EquipmentMobileCard";

const Equipment = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
    eq.imei?.includes(search) ||
    getClientName(eq.client_id).toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteEquipment.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader 
          title="Equipamentos" 
          actionLabel="Novo Equipamento"
          onAction={() => navigate("/equipment/new")}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por marca, modelo, serial ou cliente..."
          className="md:max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredEquipment?.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum equipamento encontrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredEquipment?.map((eq) => (
              <EquipmentMobileCard
                key={eq.id}
                equipment={eq}
                clientName={getClientName(eq.client_id)}
                onView={() => navigate(`/equipment/${eq.id}`)}
                onEdit={() => navigate(`/equipment/${eq.id}/edit`)}
                onDelete={() => setDeleteId(eq.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] max-w-[160px]">Cliente</TableHead>
                  <TableHead className="w-24">Marca</TableHead>
                  <TableHead className="w-28">Modelo</TableHead>
                  <TableHead className="w-32">Serial/IMEI</TableHead>
                  <TableHead className="text-right w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment?.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-medium max-w-[160px] truncate" title={getClientName(eq.client_id)}>{getClientName(eq.client_id)}</TableCell>
                    <TableCell className="text-sm">{eq.brand}</TableCell>
                    <TableCell className="text-sm max-w-[110px] truncate" title={eq.model}>{eq.model}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate" title={eq.serial_number || eq.imei || undefined}>{eq.serial_number || eq.imei || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/equipment/${eq.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/equipment/${eq.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(eq.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
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
