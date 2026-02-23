import { useState, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBankReconciliation } from "@/hooks/useBankReconciliation";
import { useOFXReconciliation, MatchSuggestion } from "@/hooks/useOFXReconciliation";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { 
  Landmark, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Sparkles,
  Check,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 80) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {confidence}%
      </Badge>
    );
  }
  if (confidence >= 50) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {confidence}%
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <XCircle className="h-3 w-3 mr-1" />
      {confidence}%
    </Badge>
  );
}

function StatusBadge({ status }: { status: MatchSuggestion["status"] }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700">
          <Check className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700">
          <X className="h-3 w-3 mr-1" />
          Rejeitado
        </Badge>
      );
    case "manual":
      return (
        <Badge variant="outline">
          <AlertCircle className="h-3 w-3 mr-1" />
          Manual
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          Pendente
        </Badge>
      );
  }
}

interface ReassignPopoverProps {
  ofxFitId: string;
  availableTransactions: any[];
  onReassign: (ofxFitId: string, systemTxId: string) => void;
}

function ReassignPopover({ ofxFitId, availableTransactions, onReassign }: ReassignPopoverProps) {
  const [open, setOpen] = useState(false);

  if (availableTransactions.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Trocar match">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-60 overflow-y-auto" align="end">
        <div className="p-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">Selecione outra transação do sistema</p>
        </div>
        <div className="divide-y">
          {availableTransactions.map((tx) => (
            <button
              key={tx.id}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
              onClick={() => {
                onReassign(ofxFitId, tx.id);
                setOpen(false);
              }}
            >
              <p className="font-medium truncate">{tx.description || "Sem descrição"}</p>
              <p className="text-xs text-muted-foreground">
                {tx.paid_at
                  ? format(new Date(tx.paid_at), "dd/MM/yy", { locale: ptBR })
                  : tx.due_date} •{" "}
                <span className={tx.direction === "PAY" ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(tx.amount)}
                </span>
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ReconciliationTableProps {
  suggestions: MatchSuggestion[];
  unmatchedTransactions: any[];
  onUpdateStatus: (fitId: string, status: MatchSuggestion["status"]) => void;
  onReassign: (fitId: string, systemTxId: string) => void;
  onApproveAll: () => void;
  direction: "RECEIVE" | "PAY";
}

function ReconciliationTable({
  suggestions,
  unmatchedTransactions,
  onUpdateStatus,
  onReassign,
  onApproveAll,
  direction,
}: ReconciliationTableProps) {
  const approvedCount = suggestions.filter((s) => s.status === "approved").length;
  const highConfidenceCount = suggestions.filter((s) => s.systemTransaction && s.confidence >= 80).length;

  // Available transactions for reassignment: unmatched + currently matched in this direction
  const allAvailableForReassign = unmatchedTransactions;

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transação de {direction === "RECEIVE" ? "recebimento" : "pagamento"} no extrato.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {approvedCount} aprovados de {suggestions.length}
        </span>
        {highConfidenceCount > 0 && (
          <Button variant="outline" size="sm" onClick={onApproveAll}>
            <Check className="h-4 w-4 mr-1" />
            Aprovar Todos ({">"}80%)
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Extrato (OFX)</TableHead>
              <TableHead>Sugestão do Sistema</TableHead>
              <TableHead className="text-center w-[100px]">Confiança</TableHead>
              <TableHead className="text-center w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions.map((match) => (
              <TableRow key={match.ofxTransaction.fitId}>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[200px]">
                      {match.ofxTransaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.ofxTransaction.date} •{" "}
                      <span
                        className={
                          match.ofxTransaction.amount < 0
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        {formatCurrency(Math.abs(match.ofxTransaction.amount))}
                      </span>
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {match.systemTransaction ? (
                    <div className="text-sm">
                      <p className="font-medium truncate max-w-[200px]">
                        {match.systemTransaction.description || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.systemTransaction.paid_at
                          ? format(
                              new Date(match.systemTransaction.paid_at),
                              "dd/MM/yy",
                              { locale: ptBR }
                            )
                          : match.systemTransaction.due_date}{" "}
                        •{" "}
                        <span
                          className={
                            match.systemTransaction.direction === "PAY"
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {formatCurrency(match.systemTransaction.amount)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Sem correspondência
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <ConfidenceBadge confidence={match.confidence} />
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={match.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {match.status === "pending" && match.systemTransaction && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600"
                          onClick={() =>
                            onUpdateStatus(match.ofxTransaction.fitId, "approved")
                          }
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() =>
                            onUpdateStatus(match.ofxTransaction.fitId, "rejected")
                          }
                          title="Rejeitar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ReassignPopover
                      ofxFitId={match.ofxTransaction.fitId}
                      availableTransactions={allAvailableForReassign}
                      onReassign={onReassign}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ConciliacaoBancaria() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { accounts } = useFinancialAccounts();

  const {
    isLoading: isOFXLoading,
    isParsing,
    ofxStatement,
    matchSuggestions,
    receiveSuggestions,
    paySuggestions,
    unmatchedReceiveTransactions,
    unmatchedPayTransactions,
    parseOFXFile,
    runAIMatching,
    updateSuggestionStatus,
    reassignMatch,
    approveAllByDirection,
    saveReconciliation,
    reset,
  } = useOFXReconciliation();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const toggleExpanded = (id: string) => {
    setExpandedAccounts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAccountId) {
      const statement = await parseOFXFile(file);
      if (statement) {
        // Auto-trigger AI matching
        await runAIMatching(selectedAccountId);
      }
    }
  };

  const handleStartOFX = (accountId: string) => {
    setSelectedAccountId(accountId);
    reset();
    // Trigger file input
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const approvedCount = matchSuggestions.filter((s) => s.status === "approved").length;

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
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex-1 flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartOFX(acc.id)}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Importar OFX</span>
                    </Button>
                  </div>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ofx,.qfx,.ofc"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* OFX Reconciliation Section - Full Page */}
      {(isParsing || isOFXLoading || ofxStatement) && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Conciliação Inteligente
                {selectedAccountId && accounts && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    — {accounts.find((a) => a.id === selectedAccountId)?.name}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {(isParsing || isOFXLoading) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isParsing ? "Lendo arquivo..." : "Analisando com IA..."}
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* OFX Statement Info */}
            {ofxStatement && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm mb-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">
                    {ofxStatement.transactions.length} transações carregadas
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {ofxStatement.startDate} a {ofxStatement.endDate}
                  {ofxStatement.balance && ` • Saldo: ${formatCurrency(ofxStatement.balance)}`}
                </p>
              </div>
            )}

            {/* Tabs: Recebimentos / Pagamentos */}
            {matchSuggestions.length > 0 && (
              <div className="space-y-4">
                <Tabs defaultValue="receive" className="w-full">
                  <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="receive" className="gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Recebimentos
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {receiveSuggestions.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pay" className="gap-2">
                      <ArrowDownRight className="h-4 w-4" />
                      Pagamentos
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {paySuggestions.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="receive">
                    <ReconciliationTable
                      suggestions={receiveSuggestions}
                      unmatchedTransactions={unmatchedReceiveTransactions}
                      onUpdateStatus={updateSuggestionStatus}
                      onReassign={reassignMatch}
                      onApproveAll={() => approveAllByDirection("RECEIVE")}
                      direction="RECEIVE"
                    />
                  </TabsContent>

                  <TabsContent value="pay">
                    <ReconciliationTable
                      suggestions={paySuggestions}
                      unmatchedTransactions={unmatchedPayTransactions}
                      onUpdateStatus={updateSuggestionStatus}
                      onReassign={reassignMatch}
                      onApproveAll={() => approveAllByDirection("PAY")}
                      direction="PAY"
                    />
                  </TabsContent>
                </Tabs>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={reset}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveReconciliation}
                    disabled={approvedCount === 0 || isOFXLoading}
                  >
                    {isOFXLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salvar {approvedCount} Conciliação(ões)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
