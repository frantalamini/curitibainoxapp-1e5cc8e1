import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDREData } from "@/hooks/useDREData";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function VarianceIndicator({ expected, realized }: { expected: number; realized: number }) {
  if (expected === 0 && realized === 0) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  
  const variance = realized - expected;
  const isPositive = variance > 0;
  const isNegative = variance < 0;
  
  if (Math.abs(variance) < 0.01) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  
  return isPositive ? (
    <TrendingUp className="h-4 w-4 text-green-600" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-600" />
  );
}

function DRETable({ 
  incomeSummaries, 
  expenseSummaries, 
  totals, 
  isLoading,
  showMonthly,
}: {
  incomeSummaries: Array<{
    categoryId: string;
    categoryName: string;
    expectedMonth: number;
    realizedMonth: number;
    expectedYear: number;
    realizedYear: number;
  }>;
  expenseSummaries: Array<{
    categoryId: string;
    categoryName: string;
    expectedMonth: number;
    realizedMonth: number;
    expectedYear: number;
    realizedYear: number;
  }>;
  totals: {
    totalIncomeExpectedMonth: number;
    totalIncomeRealizedMonth: number;
    totalExpenseExpectedMonth: number;
    totalExpenseRealizedMonth: number;
    netExpectedMonth: number;
    netRealizedMonth: number;
    totalIncomeExpectedYear: number;
    totalIncomeRealizedYear: number;
    totalExpenseExpectedYear: number;
    totalExpenseRealizedYear: number;
    netExpectedYear: number;
    netRealizedYear: number;
  };
  isLoading: boolean;
  showMonthly: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const getExpected = (item: typeof incomeSummaries[0]) => 
    showMonthly ? item.expectedMonth : item.expectedYear;
  const getRealized = (item: typeof incomeSummaries[0]) => 
    showMonthly ? item.realizedMonth : item.realizedYear;

  const incomeExpected = showMonthly ? totals.totalIncomeExpectedMonth : totals.totalIncomeExpectedYear;
  const incomeRealized = showMonthly ? totals.totalIncomeRealizedMonth : totals.totalIncomeRealizedYear;
  const expenseExpected = showMonthly ? totals.totalExpenseExpectedMonth : totals.totalExpenseExpectedYear;
  const expenseRealized = showMonthly ? totals.totalExpenseRealizedMonth : totals.totalExpenseRealizedYear;
  const netExpected = showMonthly ? totals.netExpectedMonth : totals.netExpectedYear;
  const netRealized = showMonthly ? totals.netRealizedMonth : totals.netRealizedYear;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="w-[40%]">Categoria</TableHead>
          <TableHead className="text-right">Previsto</TableHead>
          <TableHead className="text-right">Realizado</TableHead>
          <TableHead className="text-right">Variação</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* RECEITAS */}
        <TableRow className="bg-green-50 dark:bg-green-950/20">
          <TableCell colSpan={5} className="font-semibold text-green-700 dark:text-green-400">
            RECEITAS
          </TableCell>
        </TableRow>
        {incomeSummaries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
              Nenhuma categoria de receita cadastrada
            </TableCell>
          </TableRow>
        ) : (
          incomeSummaries.map((item) => {
            const expected = getExpected(item);
            const realized = getRealized(item);
            const variance = realized - expected;
            
            return (
              <TableRow key={item.categoryId}>
                <TableCell className="pl-6">{item.categoryName}</TableCell>
                <TableCell className="text-right">{formatCurrency(expected)}</TableCell>
                <TableCell className="text-right">{formatCurrency(realized)}</TableCell>
                <TableCell className={cn(
                  "text-right",
                  variance > 0 && "text-green-600",
                  variance < 0 && "text-red-600"
                )}>
                  {formatCurrency(variance)}
                </TableCell>
                <TableCell>
                  <VarianceIndicator expected={expected} realized={realized} />
                </TableCell>
              </TableRow>
            );
          })
        )}
        <TableRow className="bg-green-100 dark:bg-green-900/30 font-semibold">
          <TableCell>Total Receitas</TableCell>
          <TableCell className="text-right">{formatCurrency(incomeExpected)}</TableCell>
          <TableCell className="text-right">{formatCurrency(incomeRealized)}</TableCell>
          <TableCell className={cn(
            "text-right",
            incomeRealized - incomeExpected > 0 && "text-green-600",
            incomeRealized - incomeExpected < 0 && "text-red-600"
          )}>
            {formatCurrency(incomeRealized - incomeExpected)}
          </TableCell>
          <TableCell>
            <VarianceIndicator expected={incomeExpected} realized={incomeRealized} />
          </TableCell>
        </TableRow>

        {/* DESPESAS */}
        <TableRow className="bg-red-50 dark:bg-red-950/20">
          <TableCell colSpan={5} className="font-semibold text-red-700 dark:text-red-400">
            DESPESAS
          </TableCell>
        </TableRow>
        {expenseSummaries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
              Nenhuma categoria de despesa cadastrada
            </TableCell>
          </TableRow>
        ) : (
          expenseSummaries.map((item) => {
            const expected = getExpected(item);
            const realized = getRealized(item);
            const variance = realized - expected;
            
            return (
              <TableRow key={item.categoryId}>
                <TableCell className="pl-6">{item.categoryName}</TableCell>
                <TableCell className="text-right">{formatCurrency(expected)}</TableCell>
                <TableCell className="text-right">{formatCurrency(realized)}</TableCell>
                <TableCell className={cn(
                  "text-right",
                  variance < 0 && "text-green-600", // For expenses, less is better
                  variance > 0 && "text-red-600"
                )}>
                  {formatCurrency(variance)}
                </TableCell>
                <TableCell>
                  {/* For expenses, invert the indicator logic */}
                  {variance < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : variance > 0 ? (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
        <TableRow className="bg-red-100 dark:bg-red-900/30 font-semibold">
          <TableCell>Total Despesas</TableCell>
          <TableCell className="text-right">{formatCurrency(expenseExpected)}</TableCell>
          <TableCell className="text-right">{formatCurrency(expenseRealized)}</TableCell>
          <TableCell className={cn(
            "text-right",
            expenseRealized - expenseExpected < 0 && "text-green-600",
            expenseRealized - expenseExpected > 0 && "text-red-600"
          )}>
            {formatCurrency(expenseRealized - expenseExpected)}
          </TableCell>
          <TableCell>
            {expenseRealized - expenseExpected < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : expenseRealized - expenseExpected > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
          </TableCell>
        </TableRow>

        {/* RESULTADO */}
        <TableRow className="bg-primary/10 font-bold text-lg">
          <TableCell>RESULTADO LÍQUIDO</TableCell>
          <TableCell className="text-right">{formatCurrency(netExpected)}</TableCell>
          <TableCell className="text-right">{formatCurrency(netRealized)}</TableCell>
          <TableCell className={cn(
            "text-right",
            netRealized - netExpected > 0 && "text-green-600",
            netRealized - netExpected < 0 && "text-red-600"
          )}>
            {formatCurrency(netRealized - netExpected)}
          </TableCell>
          <TableCell>
            <VarianceIndicator expected={netExpected} realized={netRealized} />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function DRE() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { incomeSummaries, expenseSummaries, totals, isLoading } = useDREData(selectedMonth, selectedYear);

  return (
    <PageContainer>
      <PageHeader title="DRE - Demonstrativo de Resultados" showBackButton backTo="/financas/fluxo-de-caixa" />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mês:</span>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ano:</span>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Visão Mensal</TabsTrigger>
          <TabsTrigger value="yearly">Visão Anual</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                DRE - {MONTHS.find(m => m.value === selectedMonth)?.label} de {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DRETable
                incomeSummaries={incomeSummaries}
                expenseSummaries={expenseSummaries}
                totals={totals}
                isLoading={isLoading}
                showMonthly={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                DRE - Acumulado {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DRETable
                incomeSummaries={incomeSummaries}
                expenseSummaries={expenseSummaries}
                totals={totals}
                isLoading={isLoading}
                showMonthly={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalIncomeRealizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(totals.totalIncomeExpectedMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.totalExpenseRealizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(totals.totalExpenseExpectedMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totals.netRealizedMonth >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(totals.netRealizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(totals.netExpectedMonth)}
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
