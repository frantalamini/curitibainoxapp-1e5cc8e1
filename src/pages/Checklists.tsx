import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { useChecklists } from "@/hooks/useChecklists";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/ui/page-header";
import { ChecklistMobileCard } from "@/components/mobile/ChecklistMobileCard";

const Checklists = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { checklists, isLoading, deleteChecklist } = useChecklists();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteChecklist(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">Carregando checklists...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
        <PageHeader 
          title="Checklists" 
          actionLabel="Novo Checklist"
          onAction={() => navigate("/checklists/new")}
        />

        {!checklists || checklists.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum checklist cadastrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {checklists.map((checklist) => (
              <ChecklistMobileCard
                key={checklist.id}
                checklist={checklist}
                onEdit={() => navigate(`/checklists/edit/${checklist.id}`)}
                onDelete={() => setDeleteId(checklist.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklists.map((checklist) => (
                  <TableRow key={checklist.id}>
                    <TableCell className="font-medium">{checklist.name}</TableCell>
                    <TableCell>{checklist.description || "-"}</TableCell>
                    <TableCell>{Array.isArray(checklist.items) ? checklist.items.length : 0} itens</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/checklists/edit/${checklist.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(checklist.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
              Tem certeza que deseja excluir este checklist? Esta ação não pode ser desfeita.
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

export default Checklists;
