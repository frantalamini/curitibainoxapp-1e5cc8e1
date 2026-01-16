import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useState } from "react";
import { useCashFlow } from "@/hooks/useCashFlow";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
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
import { useIsMobile } from "@/hooks/use-mobile";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function FluxoDeCaixa() {
  const { isAdmin, loading } = useUserRole();
  const isMobile = useIsMobile();
  
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { dailyBalances, summary, accounts, isLoading } = useCashFlow(
    selectedAccount,
    startDate,
    endDate
  );

  if (loading) {
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
        <PageHeader title="Fluxo de Caixa" />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                {format(startDate, "dd/MM/yyyy")}
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

        {/* Daily Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : dailyBalances.length === 0 ? (
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
                  <TableHead className="sticky left-0 bg-background min-w-[100px]">Data</TableHead>
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
                {dailyBalances.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {format(parseISO(day.date), "dd/MM", { locale: ptBR })}
                      <span className="text-xs text-muted-foreground ml-1">
                        {format(parseISO(day.date), "EEE", { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(day.openingBalance)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {day.expectedIncome > 0 ? formatCurrency(day.expectedIncome) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {day.expectedExpense > 0 ? formatCurrency(day.expectedExpense) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {day.realizedIncome > 0 ? formatCurrency(day.realizedIncome) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {day.realizedExpense > 0 ? formatCurrency(day.realizedExpense) : "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      day.expectedClosing >= 0 ? "text-blue-600" : "text-destructive"
                    )}>
                      {formatCurrency(day.expectedClosing)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      day.realizedClosing >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {formatCurrency(day.realizedClosing)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
}
