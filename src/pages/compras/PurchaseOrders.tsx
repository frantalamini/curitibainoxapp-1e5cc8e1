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
  Send,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseOrders,
  type PurchaseOrderStatus,
} from "@/hooks/usePurchaseOrders";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<
  PurchaseOrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "default" },
  SENT: { label: "Enviado", variant: "outline" },
  PARTIAL: { label: "Parcial", variant: "outline" },
  RECEIVED: { label: "Recebido", variant: "default" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { currentProfile } = useAccessProfiles();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<PurchaseOrderStatus | "ALL">(
    "ALL",
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "send" | "cancel" | "delete";
    id: string;
  } | null>(null);

  const filters =
    activeTab !== "ALL"
      ? { status: activeTab as PurchaseOrderStatus }
      : undefined;
  const {
    orders,
    isLoading,
    approveOrder,
    markAsSent,
    cancelOrder,
    deleteOrder,
  } = usePurchaseOrders(filters);
  const userId = currentProfile?.user_id || "";

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toString().includes(s) ||
      o.supplier?.full_name?.toLowerCase().includes(s)
    );
  });

  const confirmAction = async () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;
    try {
      if (type === "approve")
        await approveOrder.mutateAsync({ id, approvedBy: userId });
      else if (type === "send") await markAsSent.mutateAsync(id);
      else if (type === "cancel") await cancelOrder.mutateAsync(id);
      else if (type === "delete") await deleteOrder.mutateAsync(id);
    } catch (e) {
      /* handled */
    }
    setConfirmDialog(null);
  };

  const draftCount = orders.filter((o) => o.status === "DRAFT").length;
  const approvedCount = orders.filter((o) => o.status === "APPROVED").length;
  const sentCount = orders.filter((o) =>
    ["SENT", "PARTIAL"].includes(o.status),
  ).length;
  const receivedCount = orders.filter((o) => o.status === "RECEIVED").length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Pedidos de Compra"
          actionLabel="Novo Pedido"
          onAction={() => navigate("/compras/pedidos/novo")}
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="ALL">Todos ({orders.length})</TabsTrigger>
            <TabsTrigger value="DRAFT">Rascunho ({draftCount})</TabsTrigger>
            <TabsTrigger value="APPROVED">
              Aprovados ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="SENT">Enviados ({sentCount})</TabsTrigger>
            <TabsTrigger value="RECEIVED">
              Recebidos ({receivedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum pedido encontrado.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Entrega Prev.</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/compras/pedidos/${o.id}/editar`)
                        }
                      >
                        <TableCell className="font-medium">
                          {o.order_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(o.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{o.supplier?.full_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          {o.purchase_order_items?.length || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(o.total).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell>
                          {o.expected_delivery
                            ? format(
                                new Date(o.expected_delivery + "T12:00:00"),
                                "dd/MM/yyyy",
                                { locale: ptBR },
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.payment_terms || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[o.status]?.variant}>
                            {STATUS_MAP[o.status]?.label}
                          </Badge>
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
                                  navigate(`/compras/pedidos/${o.id}/editar`)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              {o.status === "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "approve",
                                      id: o.id,
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />{" "}
                                  Aprovar
                                </DropdownMenuItem>
                              )}
                              {o.status === "APPROVED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "send",
                                      id: o.id,
                                    })
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" /> Enviar ao
                                  Fornecedor
                                </DropdownMenuItem>
                              )}
                              {["SENT", "PARTIAL"].includes(o.status) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(
                                      `/compras/recebimentos/novo?orderId=${o.id}`,
                                    )
                                  }
                                >
                                  <Package className="mr-2 h-4 w-4" /> Registrar
                                  Recebimento
                                </DropdownMenuItem>
                              )}
                              {!["RECEIVED", "CANCELLED"].includes(
                                o.status,
                              ) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "cancel",
                                      id: o.id,
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                </DropdownMenuItem>
                              )}
                              {o.status === "DRAFT" && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "delete",
                                      id: o.id,
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
                    ))}
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
              <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja prosseguir?
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
