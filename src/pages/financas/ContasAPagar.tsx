import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, Link } from "react-router-dom";
import { Loader2, FileText, Plus, Check, X, Pencil, Trash2, CreditCard } from "lucide-react";
import { usePayables, PayableInsert } from "@/hooks/usePayables";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useCadastros } from "@/hooks/useCadastros";
import { useCreditCards, calculateStatementDate } from "@/hooks/useCreditCards";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
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

const emptyForm: PayableInsert = {
  client_id: null,
  description: "",
  due_date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  category_id: null,
  cost_center_id: null,
  financial_account_id: null,
  payment_method: null,
  notes: null,
  credit_card_id: null,
  credit_card_statement_date: null,
};

export default function ContasAPagar() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts } = useFinancialAccounts();
  const { expenseCategories } = useFinancialCategories();
  const { costCenters } = useCostCenters();
  const { cadastros: suppliers } = useCadastros({ tipo: "fornecedor" });
  const { activeCards } = useCreditCards();
  const { activePaymentMethods } = usePaymentMethods();

  // Filters
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const {
    payables,
    isLoading,
    createPayable,
    updatePayable,
    markAsPaid,
    cancelPayable,
    deletePayable,
    summary,
  } = usePayables({
    startDate,
    endDate,
    status: statusFilter,
    supplierId: supplierFilter || undefined,
    categoryId: categoryFilter || undefined,
  });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PayableInsert>(emptyForm);

  // Mark as paid dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAccountId, setPayAccountId] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      client_id: p.client_id,
      description: p.description || "",
      due_date: p.due_date,
      amount: Number(p.amount),
      category_id: p.category_id,
      cost_center_id: p.cost_center_id,
      financial_account_id: p.financial_account_id,
      payment_method: p.payment_method,
      notes: p.notes,
      credit_card_id: p.credit_card_id,
      credit_card_statement_date: p.credit_card_statement_date,
    });
    setFormOpen(true);
  };

  // Quando seleciona cartão de crédito, calcula automaticamente a data de vencimento da fatura
  const handleCreditCardChange = (cardId: string | null) => {
    if (!cardId) {
      setForm({ ...form, credit_card_id: null, credit_card_statement_date: null });
      return;
    }
    
    const card = activeCards.find(c => c.id === cardId);
    if (card) {
      const purchaseDate = form.due_date ? new Date(form.due_date) : new Date();
      const statementDate = calculateStatementDate(purchaseDate, card.closing_day, card.due_day);
      setForm({
        ...form,
        credit_card_id: cardId,
        credit_card_statement_date: format(statementDate, "yyyy-MM-dd"),
        payment_method: "Cartão de Crédito", // Auto-seleciona forma de pagamento
      });
    }
  };

  const handleSave = () => {
    if (!form.description || !form.due_date || form.amount <= 0) return;

    if (editingId) {
      updatePayable.mutate(
        { id: editingId, data: form },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createPayable.mutate(form, { onSuccess: () => setFormOpen(false) });
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
        <PageHeader title="Contas a Pagar">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/financas/cartoes">
                <CreditCard className="h-4 w-4 mr-2" /> Cartões
              </Link>
            </Button>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
            </Button>
          </div>
        </PageHeader>

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
                <Label className="text-xs">Fornecedor</Label>
                <Select value={supplierFilter || "__all__"} onValueChange={(v) => setSupplierFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {expenseCategories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            ) : payables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma conta a pagar</h3>
                <p className="text-sm text-muted-foreground">Clique em "Novo Lançamento" para adicionar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payables.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {p.description || "-"}
                        </TableCell>
                        <TableCell>{p.supplier?.full_name || "-"}</TableCell>
                        <TableCell>{p.category?.name || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(p.amount))}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell>
                          {p.paid_at
                            ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {p.status === "OPEN" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    setPayDialog({ open: true, id: p.id });
                                    setPayDate(format(new Date(), "yyyy-MM-dd"));
                                    setPayAccountId("");
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  onClick={() => handleEdit(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  onClick={() => cancelPayable.mutate(p.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => deletePayable.mutate(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New/Edit Form Sheet */}
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingId ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Descrição *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Compra de material"
                />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select
                  value={form.client_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, client_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
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
                    {expenseCategories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={form.payment_method || "__none__"}
                  onValueChange={(v) => setForm({ ...form, payment_method: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {activePaymentMethods?.map((pm) => (
                      <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                    ))}
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Seção Cartão de Crédito */}
              {form.payment_method === "Cartão de Crédito" && (
                <div className="p-3 bg-muted rounded-lg space-y-3">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cartão de Crédito
                  </Label>
                  <Select
                    value={form.credit_card_id || "__none__"}
                    onValueChange={(v) => handleCreditCardChange(v === "__none__" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {activeCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} {card.last_digits ? `(**** ${card.last_digits})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.credit_card_id && form.credit_card_statement_date && (
                    <div className="text-sm text-muted-foreground">
                      Esta despesa será cobrada na fatura com vencimento em{" "}
                      <span className="font-medium text-foreground">
                        {format(new Date(form.credit_card_statement_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                  {activeCards.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Nenhum cartão cadastrado.{" "}
                      <Link to="/financas/configuracoes" className="text-primary underline">
                        Cadastrar cartão
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Centro de Custo</Label>
                <Select
                  value={form.cost_center_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, cost_center_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {costCenters?.filter(cc => cc.is_active).map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta Bancária</Label>
                <Select
                  value={form.financial_account_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, financial_account_id: v === "__none__" ? null : v })}
                >
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
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações adicionais..."
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
                disabled={createPayable.isPending || updatePayable.isPending}
              >
                {(createPayable.isPending || updatePayable.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingId ? "Salvar" : "Criar"}
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
