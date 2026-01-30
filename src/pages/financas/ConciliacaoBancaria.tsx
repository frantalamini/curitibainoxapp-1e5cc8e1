import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useBankReconciliation } from "@/hooks/useBankReconciliation";
import { 
  Landmark, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const MONTHS = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function ConciliacaoBancaria() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);

  const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const {
    reconciliations,
    totalOpeningBalance,
    totalReceived,
    totalPaid,
    totalCalculatedBalance,
    getTransactionsByAccount,
    isLoading,
  } = useBankReconciliation(selectedYear, month);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const toggleExpanded = (id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <PageContainer>
      <PageHeader title="Conciliação Bancária" />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2">
                {formatCurrency(totalOpeningBalance)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Entradas</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(totalReceived)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Saídas</p>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(totalPaid)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Saldo Final</p>
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p
                className={cn(
                  "text-2xl font-bold mt-2",
                  totalCalculatedBalance >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(totalCalculatedBalance)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Movimentação por Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conta financeira cadastrada
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map((acc) => (
                <Collapsible
                  key={acc.id}
                  open={expandedAccounts.includes(acc.id)}
                  onOpenChange={() => toggleExpanded(acc.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {acc.bankName || "Conta"} • {acc.transactionsCount} lançamento(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                          <p className="font-medium">{formatCurrency(acc.openingBalance)}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-green-600">+ Entradas</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(acc.totalReceived)}
                          </p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-red-600">- Saídas</p>
                          <p className="font-medium text-red-600">
                            {formatCurrency(acc.totalPaid)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Saldo Final</p>
                          <p
                            className={cn(
                              "font-bold",
                              acc.calculatedBalance >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(acc.calculatedBalance)}
                          </p>
                        </div>
                        {expandedAccounts.includes(acc.id) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 ml-8 border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Data Pgto</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-center">Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTransactionsByAccount(acc.id).length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-muted-foreground py-4"
                              >
                                Nenhuma transação no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            getTransactionsByAccount(acc.id).map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="text-sm">
                                  {t.paid_at
                                    ? format(new Date(t.paid_at), "dd/MM/yy", {
                                        locale: ptBR,
                                      })
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {t.description || "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {t.direction === "RECEIVE" ? (
                                    <Badge
                                      variant="outline"
                                      className="text-green-600 border-green-200 bg-green-50"
                                    >
                                      <ArrowUpRight className="h-3 w-3 mr-1" />
                                      Entrada
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-red-600 border-red-200 bg-red-50"
                                    >
                                      <ArrowDownRight className="h-3 w-3 mr-1" />
                                      Saída
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-medium",
                                    t.direction === "RECEIVE"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {t.direction === "RECEIVE" ? "+" : "-"}
                                  {formatCurrency(t.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
