import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const Technicians = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { technicians, isLoading, deleteTechnician } = useTechnicians();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </MainLayout>
    );
  }

  const filteredTechnicians = technicians?.filter((tech) =>
    tech.specialties?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteTechnician.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Técnicos</h1>
          <Button onClick={() => navigate("/technicians/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Técnico
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por especialidade..."
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
                  <TableHead>ID Usuário</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTechnicians?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum técnico encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechnicians?.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-mono text-sm">{tech.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {tech.specialties?.map((spec, idx) => (
                            <Badge key={idx} variant="secondary">
                              {spec}
                            </Badge>
                          )) || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tech.active ? "default" : "secondary"}>
                          {tech.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/technicians/${tech.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(tech.id)}
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
              Tem certeza que deseja excluir este técnico? Esta ação não pode ser desfeita.
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

export default Technicians;
