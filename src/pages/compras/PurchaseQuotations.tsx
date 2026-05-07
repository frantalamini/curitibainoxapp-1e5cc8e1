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
  ShoppingCart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseQuotations,
  type QuotationStatus,
} from "@/hooks/usePurchaseQuotations";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const STATUS_MAP: Record<
  QuotationStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  SENT: { label: "Enviada", variant: "outline" },
  RECEIVED: { label: "Recebida", variant: "default" },
  SELECTED: { label: "Selecionada", variant: "default" },
  REJECTED: { label: "Rejeitada", variant: "destructive" },
  EXPIRED: { label: "Expirada", variant: "destructive" },
};

export default function PurchaseQuotations() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<QuotationStatus | "ALL">("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "send" | "receive" | "select" | "delete";
    id: string;
  } | null>(null);

  const filters =
    activeTab !== "ALL" ? { status: activeTab as QuotationStatus } : undefined;
  const {
    quotations,
    isLoading,
    markAsSent,
    markAsReceived,
    selectQuotation,
    deleteQuotation,
  } = usePurchaseQuotations(filters);
  const { createFromQuotation } = usePurchaseOrders();

  const filteredQuotations = quotations.filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.quotation_number.toString().includes(s) ||
      q.supplier?.full_name?.toLowerCase().includes(s)
    );
  });

  const confirmAction = async () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;
    try {
      if (type === "send") await markAsSent.mutateAsync(id);
      else if (type === "receive") await markAsReceived.mutateAsync(id);
      else if (type === "select") {
        const { data: session } = await supabase.auth.getSession();
        await createFromQuotation.mutateAsync({
          quotationId: id,
          createdBy: session.session!.user.id,
        });
      } else if (type === "delete") await deleteQuotation.mutateAsync(id);
    } catch (e) {
      /* handled by mutation */
    }
    setConfirmDialog(null);
  };

  const pendingCount = quotations.filter((q) => q.status === "PENDING").length;
  const sentCount = quotations.filter((q) => q.status === "SENT").length;
  const receivedCount = quotations.filter(
    (q) => q.status === "RECEIVED",
  ).length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Cotações"
          actionLabel="Nova Cotação"
          onAction={() => navigate("/compras/cotacoes/nova")}
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
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="ALL">Todas ({quotations.length})</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pendentes ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="SENT">Enviadas ({sentCount})</TabsTrigger>
            <TabsTrigger value="RECEIVED">
              Recebidas ({receivedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma cotação encontrada.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Prazo Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotations.map((q) => (
                      <TableRow
                        key={q.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/compras/cotacoes/${q.id}/editar`)
                        }
                      >
                        <TableCell className="font-medium">
                          {q.quotation_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(q.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{q.supplier?.full_name || "—"}</TableCell>
                        <TableCell>
                          {q.purchase_requests
                            ? `#${q.purchase_requests.request_number}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {q.purchase_quotation_items?.length || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(q.total).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </TableCell>
                        <TableCell>
                          {q.delivery_days ? `${q.delivery_days} dias` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[q.status]?.variant}>
                            {STATUS_MAP[q.status]?.label}
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
                                  navigate(`/compras/cotacoes/${q.id}/editar`)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              {q.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "send",
                                      id: q.id,
                                    })
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" /> Marcar
                                  Enviada
                                </DropdownMenuItem>
                              )}
                              {q.status === "SENT" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "receive",
                                      id: q.id,
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />{" "}
                                  Marcar Recebida
                                </DropdownMenuItem>
                              )}
                              {q.status === "RECEIVED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "select",
                                      id: q.id,
                                    })
                                  }
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />{" "}
                                  Selecionar e Gerar Pedido
                                </DropdownMenuItem>
                              )}
                              {["PENDING", "SENT"].includes(q.status) && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "delete",
                                      id: q.id,
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
                {confirmDialog?.type === "select"
                  ? "Ao selecionar esta cotação, um Pedido de Compra será gerado automaticamente. Deseja continuar?"
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
