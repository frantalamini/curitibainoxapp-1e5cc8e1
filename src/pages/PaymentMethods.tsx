import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { Plus, Pencil, Trash2, Search, CreditCard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaymentMethodMobileCard } from "@/components/mobile/PaymentMethodMobileCard";
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

export default function PaymentMethods() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { paymentMethods, isLoading, deletePaymentMethod, toggleActive } = usePaymentMethods();

  const filteredMethods = paymentMethods.filter((pm) =>
    pm.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteId) {
      await deletePaymentMethod.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await toggleActive.mutateAsync({ id, active: !currentActive });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Formas de Pagamento">
          <Button onClick={() => navigate("/payment-methods/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Forma
          </Button>
        </PageHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar forma de pagamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile Cards */}
        {isMobile ? (
          <div className="space-y-3">
            {filteredMethods.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma forma de pagamento encontrada</p>
              </div>
            ) : (
              filteredMethods.map((pm) => (
                <PaymentMethodMobileCard
                  key={pm.id}
                  paymentMethod={pm}
                  onEdit={() => navigate(`/payment-methods/edit/${pm.id}`)}
                  onDelete={() => setDeleteId(pm.id)}
                  onToggleActive={() => handleToggleActive(pm.id, pm.active)}
                />
              ))
            )}
          </div>
        ) : (
          /* Desktop Table */
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Ordem</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMethods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma forma de pagamento encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMethods.map((pm) => (
                    <TableRow key={pm.id}>
                      <TableCell className="font-medium">{pm.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{pm.sort_order}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pm.active}
                          onCheckedChange={() => handleToggleActive(pm.id, pm.active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/payment-methods/edit/${pm.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(pm.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta forma de pagamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </MainLayout>
  );
}
