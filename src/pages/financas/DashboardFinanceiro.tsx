import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardFinanceiro } from "@/hooks/useDashboardFinanceiro";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank, 
  Percent,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCompact(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: "default" | "success" | "danger" | "warning";
  isLoading?: boolean;
}

function KPICard({ title, value, subtitle, icon, trend, trendLabel, variant = "default", isLoading }: KPICardProps) {
  const variantStyles = {
    default: "bg-card",
    success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  };

  const valueStyles = {
    default: "text-foreground",
    success: "text-green-700 dark:text-green-400",
    danger: "text-red-700 dark:text-red-400",
    warning: "text-amber-700 dark:text-amber-400",
  };

  if (isLoading) {
    return (
      <Card className={variantStyles[variant]}>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className={cn("text-2xl font-bold mt-2", valueStyles[variant])}>
          {formatCurrency(value)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {trend !== undefined && (
            <span className={cn(
              "text-xs font-medium flex items-center gap-1",
              trend >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardFinanceiro() {
  const {
    isLoading,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthProfit,
    currentMonthMargin,
    ytdIncome,
    ytdExpense,
    ytdProfit,
    monthlyTrend,
    accountsStatus,
    incomeChange,
    expenseChange,
  } = useDashboardFinanceiro();

  return (
    <PageContainer>
      <PageHeader title="Dashboard Financeiro" />

      {/* KPIs - Current Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Receitas (Mês)"
          value={currentMonthIncome}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={incomeChange}
          trendLabel="vs mês anterior"
          variant="success"
          isLoading={isLoading}
        />
        <KPICard
          title="Despesas (Mês)"
          value={currentMonthExpense}
          icon={<TrendingDown className="h-5 w-5" />}
          trend={expenseChange}
          trendLabel="vs mês anterior"
          variant="danger"
          isLoading={isLoading}
        />
        <KPICard
          title="Lucro Líquido (Mês)"
          value={currentMonthProfit}
          icon={<PiggyBank className="h-5 w-5" />}
          variant={currentMonthProfit >= 0 ? "success" : "danger"}
          isLoading={isLoading}
        />
        <KPICard
          title="Margem de Lucro"
          value={currentMonthMargin}
          subtitle={`${currentMonthMargin.toFixed(1)}% da receita`}
          icon={<Percent className="h-5 w-5" />}
          variant={currentMonthMargin >= 20 ? "success" : currentMonthMargin >= 10 ? "warning" : "danger"}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthLabel" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCompact(v)} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Profit Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lucro Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthLabel" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCompact(v)} className="text-xs" />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="Lucro"
                    stroke="hsl(var(--chart-3))" 
                    fill="hsl(var(--chart-3))" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Status + YTD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Accounts Receivable Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm">A Vencer</span>
                  </div>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {formatCurrency(accountsStatus.receivableOpen)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Vencidas</span>
                  </div>
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    {formatCurrency(accountsStatus.receivableOverdue)}
                  </span>
                </div>
                <Link to="/financas/contas-a-receber">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Payable Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-600" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">A Vencer</span>
                  </div>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {formatCurrency(accountsStatus.payableOpen)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Vencidas</span>
                  </div>
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    {formatCurrency(accountsStatus.payableOverdue)}
                  </span>
                </div>
                <Link to="/financas/contas-a-pagar">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver Detalhes
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* YTD Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Acumulado do Ano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Receitas</span>
                  <span className="font-semibold text-green-600">{formatCurrency(ytdIncome)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Despesas</span>
                  <span className="font-semibold text-red-600">{formatCurrency(ytdExpense)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Lucro Líquido</span>
                    <span className={cn(
                      "font-bold text-lg",
                      ytdProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(ytdProfit)}
                    </span>
                  </div>
                </div>
                <Link to="/financas/dre">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver DRE Completo
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link to="/financas/fluxo-de-caixa">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Fluxo de Caixa</span>
              </Button>
            </Link>
            <Link to="/financas/dre">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs">DRE</span>
              </Button>
            </Link>
            <Link to="/financas/rentabilidade-os">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <PiggyBank className="h-5 w-5" />
                <span className="text-xs">Rentabilidade OS</span>
              </Button>
            </Link>
            <Link to="/financas/contas-a-receber">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">A Receber</span>
              </Button>
            </Link>
            <Link to="/financas/contas-a-pagar">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">A Pagar</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
