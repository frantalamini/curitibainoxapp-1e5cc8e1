import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  usePurchaseRequests,
  type PurchaseRequestStatus,
} from "@/hooks/usePurchaseRequests";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<
  PurchaseRequestStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  PENDING: { label: "Pendente", variant: "outline" },
  APPROVED: { label: "Aprovada", variant: "default" },
  REJECTED: { label: "Rejeitada", variant: "destructive" },
  ORDERED: { label: "Pedida", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baixa", className: "text-slate-500" },
  NORMAL: { label: "Normal", className: "text-blue-600" },
  HIGH: { label: "Alta", className: "text-orange-600 font-medium" },
  URGENT: { label: "Urgente", className: "text-red-600 font-bold" },
};

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const { currentProfile } = useAccessProfiles();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<PurchaseRequestStatus | "ALL">(
    "ALL",
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "reject" | "cancel" | "submit" | "delete";
    id: string;
  } | null>(null);

  const filters =
    activeTab !== "ALL"
      ? { status: activeTab as PurchaseRequestStatus }
      : undefined;
  const {
    requests,
    drafts,
    pending,
    approved,
    isLoading,
    submitForApproval,
    approveRequest,
    rejectRequest,
    cancelRequest,
    deleteRequest,
  } = usePurchaseRequests(filters);

  const userId = currentProfile?.user_id || "";

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.request_number.toString().includes(s) ||
      r.clients?.full_name?.toLowerCase().includes(s) ||
      r.notes?.toLowerCase().includes(s) ||
      r.purchase_request_items?.some((i) =>
        i.description.toLowerCase().includes(s),
      )
    );
  });

  const confirmAction = async () => {
    if (!confirmDialog) return;
    const { type, id } = confirmDialog;
    try {
      if (type === "submit") await submitForApproval.mutateAsync(id);
      else if (type === "approve")
        await approveRequest.mutateAsync({ id, approvedBy: userId });
      else if (type === "reject")
        await rejectRequest.mutateAsync({
          id,
          approvedBy: userId,
          reason: "Rejeitada via lista",
        });
      else if (type === "cancel") await cancelRequest.mutateAsync(id);
      else if (type === "delete") await deleteRequest.mutateAsync(id);
    } catch (e) {
      /* handled by mutation */
    }
    setConfirmDialog(null);
  };

  const itemCount = (r: (typeof requests)[0]) =>
    r.purchase_request_items?.length || 0;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Solicitações de Compra"
          actionLabel="Nova Solicitação"
          onAction={() => navigate("/compras/solicitacoes/nova")}
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="ALL">Todas ({requests.length})</TabsTrigger>
            <TabsTrigger value="DRAFT">Rascunho ({drafts.length})</TabsTrigger>
            <TabsTrigger value="PENDING">
              Pendentes ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Aprovadas ({approved.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">
                  Carregando...
                </div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma solicitação encontrada.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Cliente / OS</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/compras/solicitacoes/${r.id}/editar`)
                        }
                      >
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
                        <TableCell>{r.clients?.full_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          {itemCount(r)}
                        </TableCell>
                        <TableCell>
                          <span className={PRIORITY_MAP[r.priority]?.className}>
                            {PRIORITY_MAP[r.priority]?.label}
                          </span>
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
                                    `/compras/solicitacoes/${r.id}/editar`,
                                  )
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              {r.status === "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "submit",
                                      id: r.id,
                                    })
                                  }
                                >
                                  <Send className="mr-2 h-4 w-4" /> Enviar p/
                                  Aprovação
                                </DropdownMenuItem>
                              )}
                              {r.status === "PENDING" && (
                                <>
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
                                    Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmDialog({
                                        open: true,
                                        type: "reject",
                                        id: r.id,
                                      })
                                    }
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />{" "}
                                    Rejeitar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!["CANCELLED", "ORDERED"].includes(r.status) && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmDialog({
                                      open: true,
                                      type: "cancel",
                                      id: r.id,
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                                </DropdownMenuItem>
                              )}
                              {r.status === "DRAFT" && (
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
