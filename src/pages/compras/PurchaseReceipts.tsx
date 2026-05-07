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
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseReceipts,
  type ReceiptStatus,
} from "@/hooks/usePurchaseReceipts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<
  ReceiptStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  INSPECTING: { label: "Em Inspeção", variant: "outline" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  PARTIAL: { label: "Parcial", variant: "outline" },
};

export default function PurchaseReceipts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ReceiptStatus | "ALL">("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "delete";
    id: string;
  } | null>(null);

  const filters =
    activeTab !== "ALL" ? { status: activeTab as ReceiptStatus } : undefined;
  const { receipts, isLoading, approveReceipt, deleteReceipt } =
    usePurchaseReceipts(filters);

  const filteredReceipts = receipts.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.receipt_number.toString().includes(s) ||
      r.supplier?.full_name?.toLowerCase().includes(s)
    );
  });

  const confirmAction = async () => {
    if (!confirmDialog) return;
    try {
      if (confirmDialog.type === "approve")
        await approveReceipt.mutateAsync(confirmDialog.id);
      else if (confirmDialog.type === "delete")
        await deleteReceipt.mutateAsync(confirmDialog.id);
    } catch (e) {
      /* handled */
    }
    setConfirmDialog(null);
  };

  const pendingCount = receipts.filter((r) =>
    ["PENDING", "INSPECTING"].includes(r.status),
  ).length;
  const approvedCount = receipts.filter((r) => r.status === "APPROVED").length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Recebimentos"
          actionLabel="Novo Recebimento"
          onAction={() => navigate("/compras/recebimentos/novo")}
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
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="ALL">Todos ({receipts.length})</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pendentes ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Aprovados ({approvedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum recebimento encontrado.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead>Divergência</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/compras/recebimentos/${r.id}/editar`)
                        }
                      >
                        <TableCell className="font-medium">
                          {r.receipt_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(r.received_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>{r.supplier?.full_name || "—"}</TableCell>
                        <TableCell>
                          #{r.purchase_orders?.order_number || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.purchase_receipt_items?.length || 0}
                        </TableCell>
                        <TableCell>
                          {r.has_divergence ? (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="h-4 w-4" /> Sim
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[r.status]?.variant}>
                            {STATUS_MAP[r.status]?.label}
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
                                  navigate(
                                    `/compras/recebimentos/${r.id}/editar`,
                                  )
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              {["PENDING", "INSPECTING"].includes(r.status) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "approve",
                                      id: r.id,
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />{" "}
                                  Aprovar (dar entrada estoque)
                                </DropdownMenuItem>
                              )}
                              {r.status === "PENDING" && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "delete",
                                      id: r.id,
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
              <AlertDialogTitle>
                {confirmDialog?.type === "approve"
                  ? "Aprovar Recebimento"
                  : "Excluir Recebimento"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog?.type === "approve"
                  ? "Ao aprovar, a entrada de estoque será gerada automaticamente e o pedido de compra será atualizado."
                  : "Tem certeza que deseja excluir este recebimento?"}
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
