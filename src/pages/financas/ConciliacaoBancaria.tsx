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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function ConciliacaoBancaria() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [showOFXDialog, setShowOFXDialog] = useState(false);
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
    parseOFXFile,
    runAIMatching,
    updateSuggestionStatus,
    approveAll,
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
    if (file) {
      await parseOFXFile(file);
    }
  };

  const handleStartOFX = (accountId: string) => {
    setSelectedAccountId(accountId);
    setShowOFXDialog(true);
    reset();
  };

  const handleRunAI = async () => {
    if (selectedAccountId && ofxStatement) {
      await runAIMatching(selectedAccountId);
    }
  };

  const pendingCount = matchSuggestions.filter((s) => s.status === "pending").length;
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

      {/* OFX Import Dialog */}
      <Dialog open={showOFXDialog} onOpenChange={setShowOFXDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Conciliação Inteligente com OFX
            </DialogTitle>
            <DialogDescription>
              Importe o extrato OFX do banco e a IA irá sugerir as correspondências automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Upload */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  1
                </span>
                Upload do Extrato OFX
              </h3>
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.qfx"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {isParsing && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              {ofxStatement && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
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
            </div>

            {/* Step 2: AI Matching */}
            {ofxStatement && matchSuggestions.length === 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    2
                  </span>
                  Executar Matching com IA
                </h3>
                <Button
                  onClick={handleRunAI}
                  disabled={isOFXLoading}
                  className="gap-2"
                >
                  {isOFXLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analisar com IA
                </Button>
              </div>
            )}

            {/* Step 3: Review Matches */}
            {matchSuggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      3
                    </span>
                    Revisar Correspondências
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {approvedCount} aprovados de {matchSuggestions.length}
                    </span>
                    <Button variant="outline" size="sm" onClick={approveAll}>
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar Todos ({">"}80%)
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Extrato (OFX)</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead className="text-center w-[100px]">Confiança</TableHead>
                        <TableHead className="text-center w-[100px]">Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchSuggestions.map((match) => (
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
                                    : "-"}{" "}
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
                            {match.systemTransaction && match.status === "pending" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600"
                                  onClick={() =>
                                    updateSuggestionStatus(
                                      match.ofxTransaction.fitId,
                                      "approved"
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() =>
                                    updateSuggestionStatus(
                                      match.ofxTransaction.fitId,
                                      "rejected"
                                    )
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowOFXDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      await saveReconciliation();
                      setShowOFXDialog(false);
                    }}
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
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
