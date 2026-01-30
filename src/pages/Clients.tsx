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
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
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
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Nome</TableHead>
                  <TableHead className="w-28">Telefone</TableHead>
                  <TableHead className="w-36">Email</TableHead>
                  <TableHead className="min-w-[100px] max-w-[180px]">Endereço</TableHead>
                  <TableHead className="w-24">Insc. Est.</TableHead>
                  <TableHead className="text-right w-20">Ações</TableHead>
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
                      <TableCell className="font-medium max-w-[150px] truncate" title={client.full_name}>{client.full_name}</TableCell>
                      <TableCell className="text-sm">{client.phone}</TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm" title={client.email || undefined}>{client.email || "-"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm" title={formatAddress()}>
                        {formatAddress()}
                      </TableCell>
                      <TableCell className="text-sm">{client.state_registration || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/clients/${client.id}/edit`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteId(client.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
