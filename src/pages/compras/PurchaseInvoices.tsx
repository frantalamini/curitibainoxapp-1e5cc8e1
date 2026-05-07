import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  BookOpen,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseInvoices,
  type InvoiceStatus,
} from "@/hooks/usePurchaseInvoices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  VALIDATED: { label: "Validada", variant: "outline" },
  BOOKED: { label: "Escriturada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

export default function PurchaseInvoices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<InvoiceStatus | "ALL">("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "book" | "cancel" | "delete";
    id: string;
  } | null>(null);

  const filters =
    activeTab !== "ALL" ? { status: activeTab as InvoiceStatus } : undefined;
  const { invoices, isLoading, bookInvoice, cancelInvoice, deleteInvoice } =
    usePurchaseInvoices(filters);

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(s) ||
      inv.supplier?.full_name?.toLowerCase().includes(s) ||
      inv.invoice_key?.includes(s)
    );
  });

  const confirmAction = async () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;
    try {
      if (type === "book") await bookInvoice.mutateAsync({ invoiceId: id });
      else if (type === "cancel") await cancelInvoice.mutateAsync(id);
      else if (type === "delete") await deleteInvoice.mutateAsync(id);
    } catch (e) {
      /* handled */
    }
    setConfirmDialog(null);
  };

  const pendingCount = invoices.filter((i) =>
    ["PENDING", "VALIDATED"].includes(i.status),
  ).length;
  const bookedCount = invoices.filter((i) => i.status === "BOOKED").length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="NF de Entrada"
          actionLabel="Nova NF"
          onAction={() => navigate("/compras/notas-entrada/nova")}
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, fornecedor ou chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="ALL">Todas ({invoices.length})</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pendentes ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="BOOKED">
              Escrituradas ({bookedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma NF encontrada.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Nat. Operação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => {
                      return (
                        <TableRow
                          key={inv.id}
                          className="cursor-pointer"
                          onClick={() =>
                            navigate(`/compras/notas-entrada/${inv.id}/editar`)
                          }
                        >
                          <TableCell className="font-medium">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(inv.issue_date + "T12:00:00"),
                              "dd/MM/yyyy",
                              { locale: ptBR },
                            )}
                          </TableCell>
                          <TableCell>
                            {inv.supplier?.full_name || "—"}
                          </TableCell>
                          <TableCell>
                            {inv.purchase_orders
                              ? `#${inv.purchase_orders.order_number}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(inv.total).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(inv as any).nature_operation || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_MAP[inv.status]?.variant}>
                              {STATUS_MAP[inv.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {["PENDING", "VALIDATED"].includes(inv.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    type: "book",
                                    id: inv.id,
                                  })
                                }
                              >
                                <BookOpen className="mr-1 h-3 w-3" />
                                Escriturar
                              </Button>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(
                                      `/compras/notas-entrada/${inv.id}/editar`,
                                    )
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                {["PENDING", "VALIDATED"].includes(
                                  inv.status,
                                ) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "book",
                                        id: inv.id,
                                      })
                                    }
                                  >
                                    <BookOpen className="mr-2 h-4 w-4" />{" "}
                                    Escriturar (gerar financeiro)
                                  </DropdownMenuItem>
                                )}
                                {inv.status !== "CANCELLED" &&
                                  !inv.financial_generated && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setConfirmDialog({
                                          open: true,
                                          type: "cancel",
                                          id: inv.id,
                                        })
                                      }
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />{" "}
                                      Cancelar
                                    </DropdownMenuItem>
                                  )}
                                {inv.status === "PENDING" && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "delete",
                                        id: inv.id,
                                      })
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={confirmDialog?.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog?.type === "book"
                  ? "Escriturar NF"
                  : confirmDialog?.type === "cancel"
                    ? "Cancelar NF"
                    : "Excluir NF"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog?.type === "book"
                  ? "Ao escriturar, as contas a pagar serão geradas automaticamente conforme as condições de pagamento do pedido."
                  : "Tem certeza que deseja prosseguir?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </MainLayout>
  );
}
