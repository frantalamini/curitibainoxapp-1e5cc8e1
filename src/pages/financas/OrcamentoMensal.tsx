import { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
import { DRE_GROUPS, DRE_GROUP_LABELS, DREGroup } from "@/lib/dreConstants";
import { toast } from "sonner";
import { Save, Copy, Calculator, TrendingUp, TrendingDown, Target } from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function OrcamentoMensal() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editedBudgets, setEditedBudgets] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { categories, isLoading: loadingCategories } = useFinancialCategories();
  const { budgets, isLoading: loadingBudgets, upsertBudget, getBudget, getYearBudget, refetch } = useCategoryBudgets(selectedYear);

  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  // Group categories by DRE group
  const categoriesByGroup = useMemo(() => {
    const grouped: Record<string, typeof categories> = {};
    
    Object.values(DRE_GROUPS).forEach(group => {
      grouped[group] = categories.filter(cat => cat.dre_group === group && cat.is_active);
    });
    
    return grouped;
  }, [categories]);

  // Calculate totals by group
  const groupTotals = useMemo(() => {
    const totals: Record<string, { month: number; year: number }> = {};
    
    Object.entries(categoriesByGroup).forEach(([group, cats]) => {
      let monthTotal = 0;
      let yearTotal = 0;
      
      cats.forEach(cat => {
        const budgetKey = `${cat.id}-${selectedMonth}`;
        const monthValue = editedBudgets[budgetKey] ?? getBudget(cat.id, selectedMonth);
        monthTotal += monthValue;
        yearTotal += getYearBudget(cat.id);
      });
      
      totals[group] = { month: monthTotal, year: yearTotal };
    });
    
    return totals;
  }, [categoriesByGroup, editedBudgets, selectedMonth, getBudget, getYearBudget]);

  const handleBudgetChange = (categoryId: string, month: number, value: string) => {
    const numValue = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    setEditedBudgets(prev => ({
      ...prev,
      [`${categoryId}-${month}`]: numValue
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = Object.entries(editedBudgets).map(([key, amount]) => {
        const [categoryId, month] = key.split("-");
        return upsertBudget.mutateAsync({
          categoryId,
          year: selectedYear,
          month: parseInt(month),
          amount
        });
      });
      
      await Promise.all(promises);
      setEditedBudgets({});
      toast.success("Orçamento salvo com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao salvar orçamento");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyFromPreviousMonth = () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    
    const newEdits: Record<string, number> = {};
    
    categories.forEach(cat => {
      // Get budget from previous month (need to fetch from budgets array)
      const prevBudget = budgets.find(
        b => b.category_id === cat.id && b.month === prevMonth && b.year === prevYear
      );
      if (prevBudget && prevBudget.amount > 0) {
        newEdits[`${cat.id}-${selectedMonth}`] = prevBudget.amount;
      }
    });
    
    if (Object.keys(newEdits).length > 0) {
      setEditedBudgets(prev => ({ ...prev, ...newEdits }));
      toast.success(`${Object.keys(newEdits).length} valores copiados do mês anterior`);
    } else {
      toast.info("Nenhum orçamento encontrado no mês anterior");
    }
  };

  const handleDistributeYearly = (categoryId: string, yearlyAmount: number) => {
    const monthlyAmount = yearlyAmount / 12;
    const newEdits: Record<string, number> = {};
    
    for (let m = 1; m <= 12; m++) {
      newEdits[`${categoryId}-${m}`] = monthlyAmount;
    }
    
    setEditedBudgets(prev => ({ ...prev, ...newEdits }));
    toast.success("Valor distribuído em 12 meses");
  };

  const isLoading = loadingCategories || loadingBudgets;
  const hasChanges = Object.keys(editedBudgets).length > 0;

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    const receitas = (groupTotals[DRE_GROUPS.RECEITAS_VENDAS]?.month || 0) + 
                     (groupTotals[DRE_GROUPS.RECEITAS_SERVICOS]?.month || 0);
    
    const despesas = (groupTotals[DRE_GROUPS.CMV_MERCADORIAS]?.month || 0) +
                     (groupTotals[DRE_GROUPS.CMV_SERVICOS]?.month || 0) +
                     (groupTotals[DRE_GROUPS.DESPESAS_VARIAVEIS]?.month || 0) +
                     (groupTotals[DRE_GROUPS.DESPESAS_FIXAS]?.month || 0) +
                     (groupTotals[DRE_GROUPS.AMORTIZACOES]?.month || 0) +
                     (groupTotals[DRE_GROUPS.PARCELAMENTO_IMPOSTOS]?.month || 0);
    
    return {
      receitas,
      despesas,
      resultado: receitas - despesas
    };
  }, [groupTotals]);

  const renderCategoryGroup = (groupKey: DREGroup, isExpense: boolean) => {
    const cats = categoriesByGroup[groupKey] || [];
    const groupTotal = groupTotals[groupKey] || { month: 0, year: 0 };
    
    if (cats.length === 0) return null;

    return (
      <div key={groupKey} className="space-y-2">
        <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg">
          <span className="font-medium text-sm">{DRE_GROUP_LABELS[groupKey]}</span>
          <Badge variant={isExpense ? "destructive" : "default"} className="font-mono">
            {formatCurrency(groupTotal.month)}
          </Badge>
        </div>
        
        <div className="space-y-1 pl-2">
          {cats.map(cat => {
            const budgetKey = `${cat.id}-${selectedMonth}`;
            const currentValue = editedBudgets[budgetKey] ?? getBudget(cat.id, selectedMonth);
            const yearTotal = getYearBudget(cat.id);
            const isEdited = budgetKey in editedBudgets;
            
            return (
              <div key={cat.id} className="flex items-center gap-2 py-1">
                <span className="flex-1 text-sm text-muted-foreground truncate">{cat.name}</span>
                <div className="relative w-32">
                  <Input
                    type="text"
                    value={currentValue > 0 ? currentValue.toFixed(2) : ""}
                    onChange={(e) => handleBudgetChange(cat.id, selectedMonth, e.target.value)}
                    placeholder="0,00"
                    className={`h-8 text-right font-mono text-sm pr-2 ${isEdited ? "border-primary bg-primary/5" : ""}`}
                  />
                </div>
                <span className="w-24 text-right text-xs text-muted-foreground font-mono">
                  Ano: {formatCurrency(yearTotal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Orçamento Mensal" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Orçamento Mensal">
        <span className="text-sm text-muted-foreground hidden md:block">
          Defina metas de receitas e despesas por categoria para o DRE
        </span>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas Previstas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(summaryTotals.receitas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas Previstas</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summaryTotals.despesas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${summaryTotals.resultado >= 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                <Target className={`h-5 w-5 ${summaryTotals.resultado >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resultado Previsto</p>
                <p className={`text-xl font-bold ${summaryTotals.resultado >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {formatCurrency(summaryTotals.resultado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Ano:</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mês:</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={handleCopyFromPreviousMonth}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar do Mês Anterior
            </Button>

            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
              {hasChanges && <Badge variant="secondary" className="ml-2">{Object.keys(editedBudgets).length}</Badge>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Budget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCategoryGroup(DRE_GROUPS.RECEITAS_VENDAS, false)}
            {renderCategoryGroup(DRE_GROUPS.RECEITAS_SERVICOS, false)}
          </CardContent>
        </Card>

        {/* CMV */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              Custos (CMV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCategoryGroup(DRE_GROUPS.CMV_MERCADORIAS, true)}
            {renderCategoryGroup(DRE_GROUPS.CMV_SERVICOS, true)}
          </CardContent>
        </Card>

        {/* Despesas Variáveis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              Despesas Variáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCategoryGroup(DRE_GROUPS.DESPESAS_VARIAVEIS, true)}
          </CardContent>
        </Card>

        {/* Despesas Fixas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Despesas Fixas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCategoryGroup(DRE_GROUPS.DESPESAS_FIXAS, true)}
          </CardContent>
        </Card>

        {/* Amortizações e Impostos */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              Amortizações e Parcelamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {renderCategoryGroup(DRE_GROUPS.AMORTIZACOES, true)}
              </div>
              <div className="space-y-4">
                {renderCategoryGroup(DRE_GROUPS.PARCELAMENTO_IMPOSTOS, true)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
