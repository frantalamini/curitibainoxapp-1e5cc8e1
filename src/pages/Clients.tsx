import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ClientMobileCard } from "@/components/mobile/ClientMobileCard";

const Clients = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { clients, isLoading, deleteClient } = useClients();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredClients = clients?.filter((client) =>
    client.full_name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.city?.toLowerCase().includes(search.toLowerCase()) ||
    client.state?.toLowerCase().includes(search.toLowerCase()) ||
    client.cpf_cnpj?.includes(search)
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteClient.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader 
          title="Clientes" 
          actionLabel="Novo Cliente"
          onAction={() => navigate("/clients/new")}
        />

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, telefone ou email..."
          className="md:max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredClients?.length === 0 ? (
          <div className="card-mobile text-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredClients?.map((client) => (
              <ClientMobileCard
                key={client.id}
                client={client}
                onView={() => navigate(`/clients/${client.id}`)}
                onEdit={() => navigate(`/clients/${client.id}/edit`)}
                onDelete={() => setDeleteId(client.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Insc. Estadual</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients?.map((client) => {
                  const formatAddress = () => {
                    if (client.street && client.city) {
                      const parts = [
                        client.street,
                        client.number || "S/N",
                      ];
                      if (client.neighborhood) parts.push(client.neighborhood);
                      return `${parts.join(", ")} - ${client.city}/${client.state}`;
                    }
                    return client.address || "-";
                  };

                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate" title={formatAddress()}>
                        {formatAddress()}
                      </TableCell>
                      <TableCell>{client.state_registration || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/clients/${client.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(client.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
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

export default Clients;
