import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useState } from "react";
import { useCashFlow } from "@/hooks/useCashFlow";
import { format, startOfMonth, endOfMonth, parseISO, startOfWeek, endOfWeek, addWeeks, startOfYear, endOfYear, getWeek, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

type ViewType = "daily" | "weekly" | "monthly" | "yearly";

interface GroupedBalance {
  label: string;
  period: string;
  openingBalance: number;
  expectedIncome: number;
  expectedExpense: number;
  realizedIncome: number;
  realizedExpense: number;
  expectedClosing: number;
  realizedClosing: number;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function FluxoDeCaixa() {
  const { isAdmin, loading } = useUserRole();
  
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [viewType, setViewType] = useState<ViewType>("daily");

  // Adjust date range based on view type
  const getAdjustedDates = () => {
    switch (viewType) {
      case "weekly":
        return {
          start: startOfWeek(startDate, { weekStartsOn: 0 }),
          end: endOfWeek(endDate, { weekStartsOn: 0 }),
        };
      case "monthly":
        return {
          start: startOfYear(startDate),
          end: endOfYear(startDate),
        };
      case "yearly":
        return {
          start: new Date(getYear(startDate) - 2, 0, 1),
          end: new Date(getYear(startDate), 11, 31),
        };
      default:
        return { start: startDate, end: endDate };
    }
  };

  const adjustedDates = getAdjustedDates();

  const { dailyBalances, summary, accounts, isLoading } = useCashFlow(
    selectedAccount,
    adjustedDates.start,
    adjustedDates.end
  );

  // Group daily balances based on view type
  const getGroupedBalances = (): GroupedBalance[] => {
    if (viewType === "daily") {
      return dailyBalances.map(day => ({
        label: format(parseISO(day.date), "dd/MM", { locale: ptBR }),
        period: format(parseISO(day.date), "EEE", { locale: ptBR }),
        ...day,
      }));
    }

    const groups = new Map<string, GroupedBalance>();

    dailyBalances.forEach((day, index) => {
      const date = parseISO(day.date);
      let key: string;
      let label: string;
      let period: string;

      switch (viewType) {
        case "weekly":
          const weekNum = getWeek(date, { weekStartsOn: 0 });
          const year = getYear(date);
          key = `${year}-W${weekNum}`;
          label = `Semana ${weekNum}`;
          period = `${format(startOfWeek(date, { weekStartsOn: 0 }), "dd/MM")} - ${format(endOfWeek(date, { weekStartsOn: 0 }), "dd/MM")}`;
          break;
        case "monthly":
          const month = getMonth(date);
          key = `${getYear(date)}-${month}`;
          label = MONTH_NAMES[month];
          period = `${getYear(date)}`;
          break;
        case "yearly":
          key = `${getYear(date)}`;
          label = `${getYear(date)}`;
          period = "";
          break;
        default:
          key = day.date;
          label = day.date;
          period = "";
      }

      const existing = groups.get(key);
      if (existing) {
        existing.expectedIncome += day.expectedIncome;
        existing.expectedExpense += day.expectedExpense;
        existing.realizedIncome += day.realizedIncome;
        existing.realizedExpense += day.realizedExpense;
        existing.expectedClosing = day.expectedClosing;
        existing.realizedClosing = day.realizedClosing;
      } else {
        groups.set(key, {
          label,
          period,
          openingBalance: day.openingBalance,
          expectedIncome: day.expectedIncome,
          expectedExpense: day.expectedExpense,
          realizedIncome: day.realizedIncome,
          realizedExpense: day.realizedExpense,
          expectedClosing: day.expectedClosing,
          realizedClosing: day.realizedClosing,
        });
      }
    });

    return Array.from(groups.values());
  };

  const groupedBalances = getGroupedBalances();

  if (loading) {
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
        <PageHeader title="Fluxo de Caixa" />

        {/* View Selector */}
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="yearly">Anual</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Conta Bancária
            </label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.filter(a => a.is_active).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} {account.bank_name ? `(${account.bank_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viewType === "daily" && (
            <div className="flex gap-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Data Início
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Data Fim
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {viewType === "monthly" && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Ano
              </label>
              <Select 
                value={getYear(startDate).toString()} 
                onValueChange={(v) => setStartDate(new Date(parseInt(v), 0, 1))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.initialBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(adjustedDates.start, "dd/MM/yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                summary.finalExpectedBalance >= 0 ? "text-blue-600" : "text-destructive"
              )}>
                {formatCurrency(summary.finalExpectedBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Entradas: {formatCurrency(summary.totalExpectedIncome)} | 
                Saídas: {formatCurrency(summary.totalExpectedExpense)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Realizado</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                summary.finalRealizedBalance >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatCurrency(summary.finalRealizedBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Entradas: {formatCurrency(summary.totalRealizedIncome)} | 
                Saídas: {formatCurrency(summary.totalRealizedExpense)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groupedBalances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum dado encontrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Configure uma conta bancária em Configurações Financeiras para visualizar o fluxo de caixa.
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background min-w-[120px]">
                    {viewType === "daily" ? "Data" : viewType === "weekly" ? "Semana" : viewType === "monthly" ? "Mês" : "Ano"}
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">Saldo Inicial</TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <span className="text-blue-600">Entr. Previstas</span>
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <span className="text-destructive">Saídas Previstas</span>
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <span className="text-green-600">Entr. Realizadas</span>
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <span className="text-orange-600">Saídas Realizadas</span>
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">Saldo Previsto</TableHead>
                  <TableHead className="text-right min-w-[120px]">Saldo Realizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedBalances.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {row.label}
                      {row.period && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {row.period}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.openingBalance)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {row.expectedIncome > 0 ? formatCurrency(row.expectedIncome) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {row.expectedExpense > 0 ? formatCurrency(row.expectedExpense) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {row.realizedIncome > 0 ? formatCurrency(row.realizedIncome) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {row.realizedExpense > 0 ? formatCurrency(row.realizedExpense) : "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      row.expectedClosing >= 0 ? "text-blue-600" : "text-destructive"
                    )}>
                      {formatCurrency(row.expectedClosing)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      row.realizedClosing >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {formatCurrency(row.realizedClosing)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}