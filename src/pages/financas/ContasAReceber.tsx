import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, Wallet, Search, Filter, Check, X, Calendar } from "lucide-react";
import { useReceivables } from "@/hooks/useReceivables";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const getStatusBadge = (status: string) => {
  switch (status) {
    case "OPEN":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Em Aberto</Badge>;
    case "PAID":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Pago</Badge>;
    case "CANCELED":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Cancelado</Badge>;
    case "PARTIAL":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Parcial</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ContasAReceber() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts } = useFinancialAccounts();
  const { clients } = useClients();

  // Filters
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [osFilter, setOsFilter] = useState("");

  const { receivables, isLoading, markAsPaid, cancelReceivable, summary } = useReceivables({
    startDate,
    endDate,
    status: statusFilter,
    clientId: clientFilter || undefined,
    osNumber: osFilter || undefined,
  });

  // Mark as paid dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAccountId, setPayAccountId] = useState("");

  const handleMarkAsPaid = () => {
    if (!payDialog.id) return;
    markAsPaid.mutate(
      { id: payDialog.id, paidAt: new Date(payDate).toISOString(), financialAccountId: payAccountId || undefined },
      { onSuccess: () => setPayDialog({ open: false, id: null }) }
    );
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Contas a Receber" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.totalOpen)}</div>
              <p className="text-xs text-muted-foreground">{summary.countOpen} título(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">{summary.countPaid} título(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAll)}</div>
              <p className="text-xs text-muted-foreground">Excluindo cancelados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="OPEN">Em Aberto</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cliente</Label>
                <Select value={clientFilter || "__all__"} onValueChange={(v) => setClientFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nº OS</Label>
                <Input
                  type="text"
                  placeholder="Ex: 123"
                  value={osFilter}
                  onChange={(e) => setOsFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : receivables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum título encontrado</h3>
                <p className="text-sm text-muted-foreground">Ajuste os filtros ou crie OS com parcelas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.service_call?.os_number ? `#${r.service_call.os_number}` : "-"}
                        </TableCell>
                        <TableCell>{r.client?.full_name || "-"}</TableCell>
                        <TableCell>
                          {r.installment_number && r.installments_total
                            ? `${r.installment_number}/${r.installments_total}`
                            : "1/1"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(r.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(r.amount))}
                        </TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell>
                          {r.paid_at
                            ? format(new Date(r.paid_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "OPEN" && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => {
                                  setPayDialog({ open: true, id: r.id });
                                  setPayDate(format(new Date(), "yyyy-MM-dd"));
                                  setPayAccountId("");
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" /> Pagar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                onClick={() => cancelReceivable.mutate(r.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mark as Paid Dialog */}
        <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ open, id: open ? payDialog.id : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Conta Bancária (opcional)</Label>
                <Select value={payAccountId || "__none__"} onValueChange={(v) => setPayAccountId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts?.filter(a => a.is_active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayDialog({ open: false, id: null })}>
                Cancelar
              </Button>
              <Button onClick={handleMarkAsPaid} disabled={markAsPaid.isPending}>
                {markAsPaid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
