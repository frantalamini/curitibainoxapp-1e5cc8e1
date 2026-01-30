import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, Wallet, Check, X, Plus, Pencil, Trash2, Info } from "lucide-react";
import { useReceivables, ReceivableInsert } from "@/hooks/useReceivables";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const emptyForm: ReceivableInsert = {
  client_id: null,
  description: "",
  due_date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  category_id: null,
  financial_account_id: null,
  payment_method: null,
  notes: null,
};

export default function ContasAReceber() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts } = useFinancialAccounts();
  const { incomeCategories } = useFinancialCategories();
  const { clients } = useClients();
  const navigate = useNavigate();

  // Filters
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [osFilter, setOsFilter] = useState("");

  const { 
    receivables, 
    isLoading, 
    markAsPaid, 
    cancelReceivable, 
    createReceivable, 
    updateReceivable, 
    deleteReceivable, 
    summary 
  } = useReceivables({
    startDate,
    endDate,
    status: statusFilter,
    clientId: clientFilter || undefined,
    osNumber: osFilter || undefined,
  });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReceivableInsert>(emptyForm);

  // Mark as paid dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAccountId, setPayAccountId] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const handleEdit = (r: any) => {
    if (r.origin === "SERVICE_CALL") return; // Can't edit OS-originated entries
    setEditingId(r.id);
    setForm({
      client_id: r.client_id,
      description: r.description || "",
      due_date: r.due_date,
      amount: Number(r.amount),
      category_id: r.category_id,
      financial_account_id: r.financial_account_id,
      payment_method: r.payment_method,
      notes: r.notes,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.description || !form.due_date || form.amount <= 0) return;

    if (editingId) {
      updateReceivable.mutate(
        { id: editingId, data: form },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createReceivable.mutate(form, { onSuccess: () => setFormOpen(false) });
    }
  };

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
        <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8 py-6 space-y-6">
        <PageHeader title="Contas a Receber">
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
          </Button>
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Card>
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
                <p className="text-sm text-muted-foreground mb-4">Ajuste os filtros ou adicione um novo lançamento.</p>
                <Button onClick={handleOpenNew}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
                </Button>
              </div>
            ) : (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[7%] min-w-[50px]">OS</TableHead>
                      <TableHead className="w-[18%]">Cliente/Descrição</TableHead>
                      <TableHead className="w-[8%]">Parcela</TableHead>
                      <TableHead className="w-[10%]">Venc.</TableHead>
                      <TableHead className="w-[10%] text-right">Valor</TableHead>
                      <TableHead className="w-[10%]">Forma</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                      <TableHead className="w-[10%]">Pago em</TableHead>
                      <TableHead className="w-[12%] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.map((r) => {
                      const isFromOS = r.origin === "SERVICE_CALL";
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.service_call?.os_number ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-primary"
                                  onClick={() => navigate(`/service-calls/${r.service_call_id}`)}
                                >
                                  #{r.service_call.os_number}
                                </Button>
                                {isFromOS && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Editar valor/data apenas na OS</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Manual</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="truncate block max-w-[150px] text-sm" title={r.client?.full_name || r.description || undefined}>
                              {r.client?.full_name || r.description || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.installment_number && r.installments_total
                              ? `${r.installment_number}/${r.installments_total}`
                              : "1/1"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(r.due_date), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(Number(r.amount))}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs truncate max-w-[80px]" title={r.payment_method || undefined}>
                            {r.payment_method || "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(r.status)}</TableCell>
                          <TableCell className="text-xs">
                            {r.paid_at
                              ? format(new Date(r.paid_at), "dd/MM/yy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {r.status === "OPEN" && (
                                <>
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
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  {!isFromOS && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2"
                                      onClick={() => handleEdit(r)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-destructive hover:text-destructive"
                                    onClick={() => cancelReceivable.mutate(r.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {!isFromOS && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  onClick={() => deleteReceivable.mutate(r.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* New/Edit Form Sheet */}
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingId ? "Editar Conta a Receber" : "Nova Conta a Receber"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Venda de equipamento"
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Select
                  value={form.client_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, client_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {incomeCategories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Input
                  value={form.payment_method || ""}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  placeholder="Ex: PIX, Boleto"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notas adicionais..."
                  rows={3}
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={createReceivable.isPending || updateReceivable.isPending}
              >
                {(createReceivable.isPending || updateReceivable.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

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
      </div>
    </MainLayout>
  );
}