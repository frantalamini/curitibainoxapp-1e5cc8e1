import { useState } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRecurringTransactions, RecurringTransactionInput } from "@/hooks/useRecurringTransactions";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Calendar, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function DespesasRecorrentes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generateMonth, setGenerateMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );

  const [formData, setFormData] = useState<RecurringTransactionInput>({
    description: "",
    amount: 0,
    direction: "PAY",
    day_of_month: 1,
    start_date: format(new Date(), "yyyy-MM-dd"),
    is_active: true,
  });

  const {
    transactions,
    isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    toggleActive,
    generateForMonth,
  } = useRecurringTransactions();

  const { categories } = useFinancialCategories();
  const { costCenters } = useCostCenters();
  const { accounts } = useFinancialAccounts();

  const expenseCategories = categories.filter(c => c.type === "expense" && c.is_active);
  const revenueCategories = categories.filter(c => c.type === "income" && c.is_active);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      description: "",
      amount: 0,
      direction: "PAY",
      day_of_month: 1,
      start_date: format(new Date(), "yyyy-MM-dd"),
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: typeof transactions[0]) => {
    setEditingId(item.id);
    setFormData({
      description: item.description,
      amount: item.amount,
      direction: item.direction,
      category_id: item.category_id,
      cost_center_id: item.cost_center_id,
      financial_account_id: item.financial_account_id,
      client_id: item.client_id,
      day_of_month: item.day_of_month,
      start_date: item.start_date,
      end_date: item.end_date,
      is_active: item.is_active,
      notes: item.notes,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description.trim()) {
      toast.error("Informe a descrição");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      if (editingId) {
        await updateTransaction.mutateAsync({ id: editingId, ...formData });
      } else {
        await createTransaction.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTransaction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleGenerate = async () => {
    const [year, month] = generateMonth.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1);
    await generateForMonth.mutateAsync(targetDate);
  };

  // Summary calculations
  const activeExpenses = transactions.filter(t => t.is_active && t.direction === "PAY");
  const activeRevenues = transactions.filter(t => t.is_active && t.direction === "RECEIVE");
  const totalMonthlyExpenses = activeExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalMonthlyRevenues = activeRevenues.reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Despesas Recorrentes" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Lançamentos Recorrentes" actionLabel="Novo" onAction={handleOpenNew} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas Mensais</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</p>
                <p className="text-xs text-muted-foreground">{activeExpenses.length} ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas Mensais</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalMonthlyRevenues)}</p>
                <p className="text-xs text-muted-foreground">{activeRevenues.length} ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalMonthlyRevenues - totalMonthlyExpenses >= 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                <Calendar className={`h-5 w-5 ${totalMonthlyRevenues - totalMonthlyExpenses >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Mensal</p>
                <p className={`text-xl font-bold ${totalMonthlyRevenues - totalMonthlyExpenses >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {formatCurrency(totalMonthlyRevenues - totalMonthlyExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Gerar Lançamentos do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Mês/Ano</Label>
              <Input
                type="month"
                value={generateMonth}
                onChange={(e) => setGenerateMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={generateForMonth.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateForMonth.isPending ? "animate-spin" : ""}`} />
              {generateForMonth.isPending ? "Gerando..." : "Gerar Lançamentos"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Gera transações em Contas a Pagar/Receber para todos os lançamentos recorrentes ativos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento recorrente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.direction === "PAY" ? "destructive" : "default"}>
                        {item.direction === "PAY" ? "Despesa" : "Receita"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>Dia {item.day_of_month}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.category?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(checked) => 
                          toggleActive.mutate({ id: item.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Lançamento Recorrente" : "Novo Lançamento Recorrente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aluguel, Salário, Mensalidade..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(v) => setFormData({ ...formData, direction: v as "PAY" | "RECEIVE", category_id: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAY">Despesa</SelectItem>
                    <SelectItem value="RECEIVE">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dia do Vencimento *</Label>
                <Select
                  value={formData.day_of_month.toString()}
                  onValueChange={(v) => setFormData({ ...formData, day_of_month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Categoria</Label>
                <Select
                  value={formData.category_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {(formData.direction === "PAY" ? expenseCategories : revenueCategories).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Centro de Custo</Label>
                <Select
                  value={formData.cost_center_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, cost_center_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {costCenters.filter(cc => cc.is_active).map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Conta Financeira</Label>
                <Select
                  value={formData.financial_account_id || "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, financial_account_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts.filter(a => a.is_active).map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createTransaction.isPending || updateTransaction.isPending}
            >
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento recorrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os lançamentos já gerados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
