import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  ClipboardList,
  ShoppingCart,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePurchaseApprovals } from "@/hooks/usePurchaseApprovals";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baixa", className: "text-slate-500" },
  NORMAL: { label: "Normal", className: "text-blue-600" },
  HIGH: { label: "Alta", className: "text-orange-600 font-medium" },
  URGENT: { label: "Urgente", className: "text-red-600 font-bold" },
};

export default function PurchaseApprovals() {
  const navigate = useNavigate();
  const { currentProfile } = useAccessProfiles();
  const userId = currentProfile?.user_id || "";
  const { pendingRequests, draftOrders, isLoading, totalPending } =
    usePurchaseApprovals();
  const { approveRequest, rejectRequest } = usePurchaseRequests();
  const { approveOrder } = usePurchaseOrders();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve_request" | "reject_request" | "approve_order";
    id: string;
    label: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const confirmAction = async () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;
    try {
      if (type === "approve_request") {
        await approveRequest.mutateAsync({ id, approvedBy: userId });
      } else if (type === "reject_request") {
        await rejectRequest.mutateAsync({
          id,
          approvedBy: userId,
          reason: rejectReason || "Rejeitada via painel de aprovações",
        });
      } else if (type === "approve_order") {
        await approveOrder.mutateAsync({ id, approvedBy: userId });
      }
    } catch (e) {
      /* handled by mutation */
    }
    setConfirmDialog(null);
    setRejectReason("");
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Aprovações de Compras" />

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">
              Carregando...
            </div>
          </div>
        ) : totalPending === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-medium">Tudo aprovado!</p>
            <p>Não há pendências de aprovação no momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Solicitações Pendentes */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Solicitações Pendentes
                    <Badge variant="secondary">{pendingRequests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">#</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Solicitante</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-center">Itens</TableHead>
                          <TableHead className="text-right">
                            Valor Est.
                          </TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead className="w-40">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((r: any) => {
                          const totalEst =
                            r.purchase_request_items?.reduce(
                              (sum: number, i: any) =>
                                sum +
                                Number(i.qty) *
                                  Number(i.estimated_unit_cost || 0),
                              0,
                            ) || 0;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">
                                {r.request_number}
                              </TableCell>
                              <TableCell>
                                {format(new Date(r.created_at), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </TableCell>
                              <TableCell>
                                {r.requested_profile?.full_name || "—"}
                              </TableCell>
                              <TableCell>
                                {r.clients?.full_name || "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {r.purchase_request_items?.length || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {totalEst.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    PRIORITY_MAP[r.priority]?.className
                                  }
                                >
                                  {PRIORITY_MAP[r.priority]?.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      navigate(
                                        `/compras/solicitacoes/${r.id}/editar`,
                                      )
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "approve_request",
                                        id: r.id,
                                        label: `Solicitação #${r.request_number}`,
                                      })
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "reject_request",
                                        id: r.id,
                                        label: `Solicitação #${r.request_number}`,
                                      })
                                    }
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pedidos Pendentes de Aprovação */}
            {draftOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Pedidos de Compra (Rascunho)
                    <Badge variant="secondary">{draftOrders.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">#</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-center">Itens</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-32">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftOrders.map((o: any) => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">
                              {o.order_number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(o.created_at), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              {o.supplier?.full_name || "—"}
                            </TableCell>
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
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    navigate(`/compras/pedidos/${o.id}/editar`)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "approve_order",
                                      id: o.id,
                                      label: `Pedido #${o.order_number}`,
                                    })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <AlertDialog
          open={confirmDialog?.open}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDialog(null);
              setRejectReason("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog?.type === "reject_request"
                  ? "Rejeitar"
                  : "Aprovar"}{" "}
                {confirmDialog?.label}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog?.type === "reject_request" ? (
                  <div className="space-y-2 mt-2">
                    <p>Informe o motivo da rejeição:</p>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Motivo da rejeição..."
                      rows={3}
                    />
                  </div>
                ) : (
                  "Tem certeza que deseja aprovar?"
                )}
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
