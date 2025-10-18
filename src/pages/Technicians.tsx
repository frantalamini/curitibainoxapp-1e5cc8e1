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
import { Plus, Search, Pencil } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const Technicians = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { technicians, isLoading } = useTechnicians();
  const [search, setSearch] = useState("");

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </MainLayout>
    );
  }

  const filteredTechnicians = technicians?.filter((tech) => {
    const searchLower = search.toLowerCase();
    return (
      tech.full_name.toLowerCase().includes(searchLower) ||
      tech.phone.includes(search) ||
      (tech.specialty_refrigeration && "refrigeração comercial".includes(searchLower)) ||
      (tech.specialty_cooking && "cocção".includes(searchLower))
    );
  });

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
              placeholder="Buscar por nome, telefone ou especialidade..."
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
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTechnicians?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum técnico encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechnicians?.map((tech) => {
                    const specialties = [];
                    if (tech.specialty_refrigeration) specialties.push("Refrigeração Comercial");
                    if (tech.specialty_cooking) specialties.push("Cocção");

                    const formattedPhone = tech.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

                    return (
                      <TableRow key={tech.id}>
                        <TableCell className="font-mono text-sm">#{tech.technician_number}</TableCell>
                        <TableCell className="font-medium">{tech.full_name}</TableCell>
                        <TableCell>{formattedPhone}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {specialties.length > 0 ? (
                              specialties.map((spec, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {spec}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tech.active ? "default" : "secondary"}>
                            {tech.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/technicians/${tech.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

    </MainLayout>
  );
};

export default Technicians;
