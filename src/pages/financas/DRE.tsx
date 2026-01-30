import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDREDataNew } from "@/hooks/useDREDataNew";
import { DRETable } from "@/components/dre/DRETable";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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

export default function DRE() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const dreData = useDREDataNew(selectedMonth, selectedYear);

  return (
    <PageContainer>
      <PageHeader title="DRE - Demonstrativo de Resultados" showBackButton backTo="/financas/fluxo-de-caixa" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
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

        <Link to="/financas/configuracoes">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configurar Categorias
          </Button>
        </Link>
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
              <DRETable {...dreData} showMonthly={true} />
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
              <DRETable {...dreData} showMonthly={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dreData.faturamento.realizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(dreData.faturamento.budgetMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem de Contribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              dreData.margemContribuicao.realizedMonth >= 0 ? "text-blue-600" : "text-red-600"
            )}>
              {formatCurrency(dreData.margemContribuicao.realizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dreData.margemContribuicaoPct.realizedMonth.toFixed(1)}% do faturamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              dreData.resultadoOperacional.realizedMonth >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(dreData.resultadoOperacional.realizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto: {formatCurrency(dreData.resultadoOperacional.budgetMonth)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              dreData.resultadoGlobal.realizedMonth >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(dreData.resultadoGlobal.realizedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ponto de Equilíbrio: {formatCurrency(dreData.pontoEquilibrio.realizedMonth)}
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
