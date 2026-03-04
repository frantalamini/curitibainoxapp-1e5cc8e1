import { useState, useRef, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useBankReconciliation } from "@/hooks/useBankReconciliation";
import { useOFXReconciliation, MatchSuggestion } from "@/hooks/useOFXReconciliation";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { ManualIncludeModal } from "@/components/conciliacao/ManualIncludeModal";
import { MultiSelectReassignPopover } from "@/components/conciliacao/MultiSelectReassignPopover";
import { OFXTransaction } from "@/lib/ofxParser";
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
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

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
    case "included":
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Plus className="h-3 w-3 mr-1" />
          Incluído
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
      return <Badge variant="secondary">Pendente</Badge>;
  }
}

/* ===== Unmatched system transactions panel ===== */
function SystemTransactionsPanel({
  title,
  icon,
  transactions,
  openTransactions,
  colorClass,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
}: {
  title: string;
  icon: React.ReactNode;
  transactions: any[];
  openTransactions: any[];
  colorClass: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSearch: () => void;
}) {
  const allTransactions = [...transactions, ...openTransactions];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        {icon}
        <span className="font-medium text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {allTransactions.length}
        </Badge>
      </div>
      {/* Period date filters */}
      <div className="flex flex-col gap-1.5 px-3 py-2 border-b bg-muted/10">
        <div className="flex items-center gap-2">
          <Label className="text-xs w-7 shrink-0">De</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-7 shrink-0">Até</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={onSearch}>
          <Sparkles className="h-3 w-3 mr-1" />
          Buscar
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {allTransactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhum lançamento</p>
        ) : (
          <div className="divide-y">
            {allTransactions.map((t) => (
              <div key={t.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-1">
                  <p className="font-medium truncate flex-1">{t.description || "Sem descrição"}</p>
                  {t.status && t.status !== "PAID" && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {t.status === "OPEN" ? "Em aberto" : t.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.paid_at
                      ? format(new Date(t.paid_at), "dd/MM/yy", { locale: ptBR })
                      : t.due_date
                        ? format(new Date(t.due_date + "T12:00:00"), "dd/MM/yy", { locale: ptBR })
                        : "-"}
                  </span>
                  <span className={cn("text-xs font-medium", colorClass)}>
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Central reconciliation panel ===== */
interface ConciliationPanelProps {
  suggestions: MatchSuggestion[];
  allUnmatchedTransactions: any[];
  ofxTransactions?: OFXTransaction[];
  onUpdateStatus: (fitId: string, status: MatchSuggestion["status"]) => void;
  onReassignMulti: (fitId: string, ids: string[]) => void;
  onApproveAllReceive: () => void;
  onApproveAllPay: () => void;
  onInclude: (ofxTx: OFXTransaction) => void;
  onRetryAI?: () => void;
  isRetrying?: boolean;
}

function ConciliationPanel({
  suggestions,
  allUnmatchedTransactions,
  ofxTransactions,
  onUpdateStatus,
  onReassignMulti,
  onApproveAllReceive,
  onApproveAllPay,
  onInclude,
  onRetryAI,
  isRetrying,
}: ConciliationPanelProps) {
  const approvedCount = suggestions.filter(s => s.status === "approved").length;
  const highConfidenceCount = suggestions.filter(s => s.systemTransaction && s.confidence >= 80 && s.status === "pending").length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Conciliação Sugerida</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {approvedCount}/{suggestions.length}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 p-2 border-b">
        {highConfidenceCount > 0 && (
          <>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onApproveAllReceive}>
              <Check className="h-3 w-3 mr-1" />
              Aprovar Receb.
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={onApproveAllPay}>
              <Check className="h-3 w-3 mr-1" />
              Aprovar Pgtos.
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {suggestions.length === 0 ? (
          <div className="p-4 space-y-3">
            {onRetryAI && (
              <div className="text-center space-y-2 pb-3 border-b">
                <p className="text-sm text-muted-foreground">Nenhuma sugestão automática encontrada.</p>
                <Button variant="outline" size="sm" onClick={onRetryAI} disabled={isRetrying}>
                  {isRetrying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Conciliar com IA
                </Button>
              </div>
            )}
            {ofxTransactions && ofxTransactions.length > 0 && (
              <div className="divide-y">
                {ofxTransactions.map((tx) => (
                  <div key={tx.fitId} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.date} •{" "}
                        <span className={tx.amount < 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(Math.abs(tx.amount))}
                        </span>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => onInclude(tx)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Incluir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {suggestions.map((match) => {
              const currentSelectedIds = match.systemTransactions?.map(t => t.id) ||
                (match.systemTransaction ? [match.systemTransaction.id] : []);

              return (
                <div key={match.ofxTransaction.fitId} className="p-3 space-y-2">
                  {/* OFX line */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{match.ofxTransaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {match.ofxTransaction.date} •{" "}
                        <span className={match.ofxTransaction.amount < 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(Math.abs(match.ofxTransaction.amount))}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ConfidenceBadge confidence={match.confidence} />
                      <StatusBadge status={match.status} />
                    </div>
                  </div>

                  {/* System match */}
                  {match.systemTransaction ? (
                    <div className="ml-4 pl-3 border-l-2 border-primary/30">
                      {(match.systemTransactions && match.systemTransactions.length > 1
                        ? match.systemTransactions
                        : [match.systemTransaction]
                      ).map(tx => (
                        <div key={tx.id} className="text-sm">
                          <p className="truncate text-muted-foreground">{tx.description || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.paid_at
                              ? format(new Date(tx.paid_at), "dd/MM/yy", { locale: ptBR })
                              : tx.due_date} •{" "}
                            <span className={tx.direction === "PAY" ? "text-red-600" : "text-green-600"}>
                              {formatCurrency(tx.amount)}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ml-4 text-xs text-muted-foreground italic">Sem correspondência</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4">
                    {match.status === "pending" && match.systemTransaction && (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs text-green-600"
                          onClick={() => onUpdateStatus(match.ofxTransaction.fitId, "approved")}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 text-xs text-red-600"
                          onClick={() => onUpdateStatus(match.ofxTransaction.fitId, "rejected")}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}

                    {match.status !== "included" && (
                      <MultiSelectReassignPopover
                        ofxFitId={match.ofxTransaction.fitId}
                        ofxAmount={match.ofxTransaction.amount}
                        availableTransactions={allUnmatchedTransactions}
                        currentSelectedIds={currentSelectedIds}
                        onConfirm={onReassignMulti}
                      />
                    )}

                    {match.status === "manual" && (
                      <Button
                        variant="outline" size="sm"
                        className="h-7 text-xs"
                        onClick={() => onInclude(match.ofxTransaction)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Incluir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Main Page ===== */
export default function ConciliacaoBancaria() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Manual include modal
  const [includeModalOpen, setIncludeModalOpen] = useState(false);
  const [includeOFXTx, setIncludeOFXTx] = useState<OFXTransaction | null>(null);

  // Period date filters for side panels (De/Até)
  const [receiveStartDate, setReceiveStartDate] = useState("");
  const [receiveEndDate, setReceiveEndDate] = useState("");
  const [payStartDate, setPayStartDate] = useState("");
  const [payEndDate, setPayEndDate] = useState("");

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
    unmatchedSystemTransactions,
    unmatchedReceiveTransactions,
    unmatchedPayTransactions,
    openReceivables,
    openPayables,
    parseOFXFile,
    runAIMatching,
    fetchOpenTransactions,
    updateSuggestionStatus,
    reassignMultiMatch,
    approveAllByDirection,
    saveReconciliation,
    createManualTransaction,
    reset,
  } = useOFXReconciliation();

  // Initialize date filters from OFX statement period and fetch
  useEffect(() => {
    if (ofxStatement) {
      setReceiveStartDate(ofxStatement.startDate);
      setReceiveEndDate(ofxStatement.endDate);
      setPayStartDate(ofxStatement.startDate);
      setPayEndDate(ofxStatement.endDate);
      // Fetch immediately with OFX dates
      fetchOpenTransactions(ofxStatement.startDate, ofxStatement.endDate);
    }
  }, [ofxStatement, fetchOpenTransactions]);

  // Manual search trigger for when user changes dates
  const triggerFetchOpenTransactions = () => {
    const startA = receiveStartDate || payStartDate;
    const startB = payStartDate || receiveStartDate;
    const endA = receiveEndDate || payEndDate;
    const endB = payEndDate || receiveEndDate;
    if (startA && endA) {
      const minDate = startA < startB ? startA : startB;
      const maxDate = endA > endB ? endA : endB;
      fetchOpenTransactions(minDate, maxDate);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Filter open transactions by each panel's date range (client-side)
  const filteredReceivables = useMemo(() =>
    openReceivables.filter((t: any) => {
      const d = t.due_date;
      return (!receiveStartDate || d >= receiveStartDate) && (!receiveEndDate || d <= receiveEndDate);
    }),
    [openReceivables, receiveStartDate, receiveEndDate]
  );

  const filteredPayables = useMemo(() =>
    openPayables.filter((t: any) => {
      const d = t.due_date;
      return (!payStartDate || d >= payStartDate) && (!payEndDate || d <= payEndDate);
    }),
    [openPayables, payStartDate, payEndDate]
  );

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
        await runAIMatching(selectedAccountId, statement);
      }
    }
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStartOFX = (accountId: string) => {
    setSelectedAccountId(accountId);
    reset();
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleIncludeClick = (ofxTx: OFXTransaction) => {
    setIncludeOFXTx(ofxTx);
    setIncludeModalOpen(true);
  };

  const handleManualIncludeConfirm = async (categoryId: string, costCenterId?: string, description?: string) => {
    if (!includeOFXTx) return false;
    return createManualTransaction(includeOFXTx, selectedAccountId, categoryId, costCenterId, description);
  };

  const approvedCount = matchSuggestions.filter((s) => s.status === "approved").length;
  const showReconciliation = isParsing || isOFXLoading || ofxStatement;

  return (
    <PageContainer>
      <PageHeader title="Conciliação Bancária" />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
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
            {isLoading ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <p className="text-2xl font-bold mt-2">{formatCurrency(totalOpeningBalance)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Entradas</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalReceived)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Saídas</p>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalPaid)}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Saldo Final</p>
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-32 mt-2" /> : (
              <p className={cn("text-2xl font-bold mt-2", totalCalculatedBalance >= 0 ? "text-green-600" : "text-red-600")}>
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
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : reconciliations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma conta financeira cadastrada</div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map((acc) => (
                <Collapsible key={acc.id} open={expandedAccounts.includes(acc.id)} onOpenChange={() => toggleExpanded(acc.id)}>
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
                            <p className="font-medium text-green-600">{formatCurrency(acc.totalReceived)}</p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-red-600">- Saídas</p>
                            <p className="font-medium text-red-600">{formatCurrency(acc.totalPaid)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Saldo Final</p>
                            <p className={cn("font-bold", acc.calculatedBalance >= 0 ? "text-green-600" : "text-red-600")}>
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
                    <Button variant="outline" size="sm" onClick={() => handleStartOFX(acc.id)} className="gap-2">
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
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                Nenhuma transação no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            getTransactionsByAccount(acc.id).map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="text-sm">
                                  {t.paid_at ? format(new Date(t.paid_at), "dd/MM/yy", { locale: ptBR }) : "-"}
                                </TableCell>
                                <TableCell className="text-sm">{t.description || "-"}</TableCell>
                                <TableCell className="text-center">
                                  {t.direction === "RECEIVE" ? (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                      <ArrowUpRight className="h-3 w-3 mr-1" />
                                      Entrada
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                      <ArrowDownRight className="h-3 w-3 mr-1" />
                                      Saída
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className={cn("text-right font-medium", t.direction === "RECEIVE" ? "text-green-600" : "text-red-600")}>
                                  {t.direction === "RECEIVE" ? "+" : "-"}{formatCurrency(t.amount)}
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
      <input ref={fileInputRef} type="file" accept=".ofx,.qfx,.ofc" onChange={handleFileSelect} className="hidden" />

      {/* OFX Reconciliation Section - 3-Panel Layout */}
      {showReconciliation && (
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

            {/* 3-Panel Layout */}
            {ofxStatement && (
              <div className="space-y-4">
                {isMobile ? (
                  /* Mobile: stacked layout */
                  <div className="space-y-4">
                    <Card className="border">
                      <div className="h-[300px] overflow-hidden">
                        <SystemTransactionsPanel
                          title="Contas a Receber"
                          icon={<ArrowUpRight className="h-4 w-4 text-green-600" />}
                          transactions={unmatchedReceiveTransactions}
                          openTransactions={filteredReceivables}
                          colorClass="text-green-600"
                          startDate={receiveStartDate}
                          endDate={receiveEndDate}
                          onStartDateChange={setReceiveStartDate}
                          onEndDateChange={setReceiveEndDate}
                          onSearch={triggerFetchOpenTransactions}
                        />
                      </div>
                    </Card>
                    <Card className="border">
                      <div className="min-h-[400px]">
                        <ConciliationPanel
                          suggestions={matchSuggestions}
                          allUnmatchedTransactions={unmatchedSystemTransactions}
                          ofxTransactions={ofxStatement?.transactions}
                          onUpdateStatus={updateSuggestionStatus}
                          onReassignMulti={reassignMultiMatch}
                          onApproveAllReceive={() => approveAllByDirection("RECEIVE")}
                          onApproveAllPay={() => approveAllByDirection("PAY")}
                          onInclude={handleIncludeClick}
                          onRetryAI={() => runAIMatching(selectedAccountId)}
                          isRetrying={isOFXLoading}
                        />
                      </div>
                    </Card>
                    <Card className="border">
                      <div className="h-[300px] overflow-hidden">
                        <SystemTransactionsPanel
                          title="Contas a Pagar"
                          icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                          transactions={unmatchedPayTransactions}
                          openTransactions={filteredPayables}
                          colorClass="text-red-600"
                          startDate={payStartDate}
                          endDate={payEndDate}
                          onStartDateChange={setPayStartDate}
                          onEndDateChange={setPayEndDate}
                          onSearch={triggerFetchOpenTransactions}
                        />
                      </div>
                    </Card>
                  </div>
                ) : (
                  /* Desktop: 3-column resizable */
                  <div className="border rounded-lg overflow-hidden h-[600px]">
                    <ResizablePanelGroup direction="horizontal">
                      <ResizablePanel defaultSize={25} minSize={15}>
                        <SystemTransactionsPanel
                          title="Contas a Receber"
                          icon={<ArrowUpRight className="h-4 w-4 text-green-600" />}
                          transactions={unmatchedReceiveTransactions}
                          openTransactions={filteredReceivables}
                          colorClass="text-green-600"
                          startDate={receiveStartDate}
                          endDate={receiveEndDate}
                          onStartDateChange={setReceiveStartDate}
                          onEndDateChange={setReceiveEndDate}
                          onSearch={triggerFetchOpenTransactions}
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <ConciliationPanel
                          suggestions={matchSuggestions}
                          allUnmatchedTransactions={unmatchedSystemTransactions}
                          ofxTransactions={ofxStatement?.transactions}
                          onUpdateStatus={updateSuggestionStatus}
                          onReassignMulti={reassignMultiMatch}
                          onApproveAllReceive={() => approveAllByDirection("RECEIVE")}
                          onApproveAllPay={() => approveAllByDirection("PAY")}
                          onInclude={handleIncludeClick}
                          onRetryAI={() => runAIMatching(selectedAccountId)}
                          isRetrying={isOFXLoading}
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={25} minSize={15}>
                        <SystemTransactionsPanel
                          title="Contas a Pagar"
                          icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
                          transactions={unmatchedPayTransactions}
                          openTransactions={filteredPayables}
                          colorClass="text-red-600"
                          startDate={payStartDate}
                          endDate={payEndDate}
                          onStartDateChange={setPayStartDate}
                          onEndDateChange={setPayEndDate}
                          onSearch={triggerFetchOpenTransactions}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={reset}>Cancelar</Button>
                  <Button onClick={saveReconciliation} disabled={approvedCount === 0 || isOFXLoading}>
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

      {/* Manual Include Modal */}
      <ManualIncludeModal
        open={includeModalOpen}
        onOpenChange={setIncludeModalOpen}
        ofxTransaction={includeOFXTx}
        onConfirm={handleManualIncludeConfirm}
      />
    </PageContainer>
  );
}
