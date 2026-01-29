import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Pencil } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { TechnicianMobileCard } from "@/components/mobile/TechnicianMobileCard";

const Technicians = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader 
          title="Técnicos" 
          actionLabel="Novo Técnico"
          onAction={() => navigate("/technicians/new")}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, telefone ou especialidade..."
          className="md:max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredTechnicians?.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum técnico encontrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredTechnicians?.map((tech) => (
              <TechnicianMobileCard
                key={tech.id}
                technician={tech}
                onEdit={() => navigate(`/technicians/${tech.id}/edit`)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead className="min-w-[100px]">Nome</TableHead>
                  <TableHead className="w-28">Telefone</TableHead>
                  <TableHead className="min-w-[100px]">Especialidades</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="text-right w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTechnicians?.map((tech) => {
                  const specialties = [];
                  if (tech.specialty_refrigeration) specialties.push("Refrigeração Comercial");
                  if (tech.specialty_cooking) specialties.push("Cocção");

                  const formattedPhone = tech.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

                  return (
                    <TableRow key={tech.id}>
                      <TableCell className="font-mono text-xs">#{tech.technician_number}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[140px] truncate" title={tech.full_name}>{tech.full_name}</TableCell>
                      <TableCell className="text-sm">{formattedPhone}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {specialties.length > 0 ? (
                            specialties.map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec === "Refrigeração Comercial" ? "Refrig." : spec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tech.active ? "default" : "secondary"} className="text-xs">
                          {tech.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/technicians/${tech.id}/edit`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Technicians;
