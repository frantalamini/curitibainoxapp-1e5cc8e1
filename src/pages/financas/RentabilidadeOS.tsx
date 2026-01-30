import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOSProfitability } from "@/hooks/useOSProfitability";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear - i);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function RentabilidadeOS() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth - 1)), "yyyy-MM-dd");
  const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)), "yyyy-MM-dd");

  const { isLoading, osProfitability, summary, topProfitable, leastProfitable } = useOSProfitability(startDate, endDate);

  return (
    <PageContainer>
      <PageHeader 
        title="Rentabilidade por OS" 
        showBackButton 
        backTo="/financas/dashboard" 
      />

      {/* Filters */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total OS</p>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-8 w-16" /> : summary.osCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold mt-2 text-green-700 dark:text-green-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold mt-2 text-red-700 dark:text-red-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalCosts)}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          summary.totalProfit >= 0 
            ? "bg-green-50 dark:bg-green-950/30" 
            : "bg-red-50 dark:bg-red-950/30"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Lucro Bruto</p>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className={cn(
              "text-2xl font-bold mt-2",
              summary.totalProfit >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            )}>
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(summary.totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Margem Média</p>
              <Percent className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className={cn(
              "text-2xl font-bold mt-2",
              summary.averageMargin >= 20 ? "text-green-600" : 
              summary.averageMargin >= 10 ? "text-amber-600" : "text-red-600"
            )}>
              {isLoading ? <Skeleton className="h-8 w-16" /> : formatPercent(summary.averageMargin)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom OS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Most Profitable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              OS Mais Rentáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topProfitable.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma OS no período</p>
            ) : (
              <div className="space-y-2">
                {topProfitable.slice(0, 5).map((os) => (
                  <div 
                    key={os.id} 
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg"
                  >
                    <div>
                      <Link to={`/service-calls/${os.id}`} className="font-semibold hover:underline">
                        OS #{os.osNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{os.clientName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-700 dark:text-green-400">
                        {formatCurrency(os.grossProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercent(os.profitMargin)} margem
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Least Profitable */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              OS com Menor Rentabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : leastProfitable.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhuma OS no período</p>
            ) : (
              <div className="space-y-2">
                {leastProfitable.slice(0, 5).map((os) => (
                  <div 
                    key={os.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      os.grossProfit < 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30"
                    )}
                  >
                    <div>
                      <Link to={`/service-calls/${os.id}`} className="font-semibold hover:underline">
                        OS #{os.osNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">{os.clientName}</p>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "font-semibold",
                        os.grossProfit < 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                      )}>
                        {formatCurrency(os.grossProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercent(os.profitMargin)} margem
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento por OS</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : osProfitability.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma OS encontrada no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osProfitability.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell>
                      <Link 
                        to={`/service-calls/${os.id}`} 
                        className="font-medium text-primary hover:underline"
                      >
                        #{os.osNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{os.clientName}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{os.technicianName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(os.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(os.totalCosts)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-semibold",
                      os.grossProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(os.grossProfit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                        os.profitMargin >= 30 ? "default" :
                        os.profitMargin >= 15 ? "secondary" :
                        "destructive"
                      }>
                        {formatPercent(os.profitMargin)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
