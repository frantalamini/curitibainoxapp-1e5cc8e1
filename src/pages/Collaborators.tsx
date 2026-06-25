import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollaborators } from "@/hooks/useCollaborators";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";

const brl = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const VINCULO_LABEL: Record<string, string> = {
  clt: "CLT",
  mei_pj: "MEI/PJ",
};

const Collaborators = () => {
  const navigate = useNavigate();
  const { collaborators, isLoading, deleteCollaborator } = useCollaborators();
  const [search, setSearch] = useState("");

  const filtered = collaborators?.filter((c) => {
    const s = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(s) ||
      (c.role_title ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <PageHeader
          title="Colaboradores"
          actionLabel="Novo Colaborador"
          onAction={() => navigate("/collaborators/new")}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou função..."
          className="md:max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : filtered?.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum colaborador cadastrado
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-28">Função</TableHead>
                  <TableHead className="w-20">Vínculo</TableHead>
                  <TableHead className="w-24">Atende OS</TableHead>
                  <TableHead className="w-28 text-right">Custo/hora</TableHead>
                  <TableHead className="w-16">Status</TableHead>
                  <TableHead className="text-right w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">
                      {c.full_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.role_title || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {VINCULO_LABEL[c.employment_type] ?? c.employment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.attends_os ? (
                        <Badge className="text-xs">Técnico</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Não
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {brl(c.cost_per_hour)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {c.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/collaborators/${c.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir ${c.full_name}?`))
                            deleteCollaborator.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Collaborators;
