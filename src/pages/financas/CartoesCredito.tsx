import { useState, useMemo } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { 
  Loader2, CreditCard, Plus, Calendar, ChevronLeft, ChevronRight, 
  Eye, Receipt, DollarSign, AlertCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCreditCards, calculateStatementDate, getStatementPeriod } from "@/hooks/useCreditCards";
import { usePayables } from "@/hooks/usePayables";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatementTransaction {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  supplier?: { full_name: string } | null;
}

export default function CartoesCredito() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const { payables, isLoading: payablesLoading } = usePayables();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Agrupa transações por cartão e calcula totais das faturas
  const cardStatements = useMemo(() => {
    const statements: Record<string, {
      card: typeof creditCards[0];
      currentStatement: { total: number; transactions: StatementTransaction[]; dueDate: Date };
      nextStatement: { total: number; transactions: StatementTransaction[]; dueDate: Date };
    }> = {};

    creditCards.forEach((card) => {
      // Calcula a data de vencimento da fatura atual (baseada no mês selecionado)
      const currentDueDate = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth(),
        card.due_day
      );

      // Próxima fatura
      const nextDueDate = addMonths(currentDueDate, 1);

      // Período de compras para a fatura atual
      const currentPeriod = getStatementPeriod(currentDueDate, card.closing_day);
      const nextPeriod = getStatementPeriod(nextDueDate, card.closing_day);

      // Filtra transações do cartão
      const cardTransactions = payables.filter(
        (p) => (p as any).credit_card_id === card.id && p.status !== "CANCELED"
      );

      const currentTransactions: StatementTransaction[] = [];
      const nextTransactions: StatementTransaction[] = [];

      cardTransactions.forEach((t) => {
        const transactionDate = new Date(t.due_date);
        
        if (isWithinInterval(transactionDate, { start: currentPeriod.start, end: currentPeriod.end })) {
          currentTransactions.push({
            id: t.id,
            description: t.description,
            amount: Number(t.amount),
            due_date: t.due_date,
            status: t.status || "OPEN",
            supplier: t.supplier,
          });
        } else if (isWithinInterval(transactionDate, { start: nextPeriod.start, end: nextPeriod.end })) {
          nextTransactions.push({
            id: t.id,
            description: t.description,
            amount: Number(t.amount),
            due_date: t.due_date,
            status: t.status || "OPEN",
            supplier: t.supplier,
          });
        }
      });

      statements[card.id] = {
        card,
        currentStatement: {
          total: currentTransactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: currentTransactions,
          dueDate: currentDueDate,
        },
        nextStatement: {
          total: nextTransactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: nextTransactions,
          dueDate: nextDueDate,
        },
      };
    });

    return statements;
  }, [creditCards, payables, selectedMonth]);

  const selectedCardData = selectedCard ? cardStatements[selectedCard] : null;

  const isLoading = roleLoading || cardsLoading || payablesLoading;

  if (roleLoading) {
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
        <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8">
          <PageHeader title="Cartões de Crédito" />

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : creditCards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum cartão cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Cadastre seus cartões de crédito nas Configurações Financeiras
                </p>
                <Button onClick={() => window.location.href = "/financas/configuracoes"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Cartão
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {Object.values(cardStatements).map(({ card, currentStatement }) => (
                  <Card 
                    key={card.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCard === card.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setSelectedCard(card.id);
                      setShowTransactions(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {card.name}
                        </CardTitle>
                        {card.card_brand && (
                          <Badge variant="outline">{card.card_brand}</Badge>
                        )}
                      </div>
                      {card.last_digits && (
                        <CardDescription>**** {card.last_digits}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Vencimento</span>
                          <span className="font-medium">
                            {format(currentStatement.dueDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Fechamento</span>
                          <span>Dia {card.closing_day}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Fatura Atual</span>
                          <span className="text-lg font-bold text-destructive">
                            {formatCurrency(currentStatement.total)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Lançamentos</span>
                          <span>{currentStatement.transactions.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Faturas do Mês</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {formatCurrency(
                        Object.values(cardStatements).reduce(
                          (sum, s) => sum + s.currentStatement.total,
                          0
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Próximas Faturas</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(
                        Object.values(cardStatements).reduce(
                          (sum, s) => sum + s.nextStatement.total,
                          0
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Lançamentos</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Object.values(cardStatements).reduce(
                        (sum, s) => sum + s.currentStatement.transactions.length + s.nextStatement.transactions.length,
                        0
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Transactions Sheet */}
          <Sheet open={showTransactions} onOpenChange={setShowTransactions}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {selectedCardData?.card.name}
                </SheetTitle>
                <SheetDescription>
                  Fatura de {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
                </SheetDescription>
              </SheetHeader>

              {selectedCardData && (
                <div className="mt-6 space-y-6">
                  {/* Statement Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total da Fatura</p>
                        <p className="text-2xl font-bold text-destructive">
                          {formatCurrency(selectedCardData.currentStatement.total)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Vencimento</p>
                        <p className="font-medium">
                          {format(selectedCardData.currentStatement.dueDate, "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div>
                    <h4 className="font-medium mb-3">
                      Lançamentos ({selectedCardData.currentStatement.transactions.length})
                    </h4>
                    {selectedCardData.currentStatement.transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum lançamento nesta fatura</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedCardData.currentStatement.transactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {t.description || "Sem descrição"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.supplier?.full_name || "Fornecedor não informado"} • {format(new Date(t.due_date), "dd/MM")}
                              </p>
                            </div>
                            <span className="font-medium text-destructive">
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Next Statement Preview */}
                  {selectedCardData.nextStatement.transactions.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Próxima Fatura ({formatCurrency(selectedCardData.nextStatement.total)})
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {format(selectedCardData.nextStatement.dueDate, "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
