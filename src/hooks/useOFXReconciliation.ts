import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseOFX, OFXStatement, OFXTransaction } from "@/lib/ofxParser";
import { toast } from "sonner";

export interface MatchSuggestion {
  ofxTransaction: OFXTransaction;
  systemTransaction: {
    id: string;
    description: string | null;
    amount: number;
    direction: string;
    due_date: string;
    paid_at: string | null;
  } | null;
  systemTransactions?: {
    id: string;
    description: string | null;
    amount: number;
    direction: string;
    due_date: string;
    paid_at: string | null;
  }[];
  confidence: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "manual" | "included";
}

export const useOFXReconciliation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [ofxStatement, setOfxStatement] = useState<OFXStatement | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>([]);
  const [unmatchedSystemTransactions, setUnmatchedSystemTransactions] = useState<any[]>([]);
  const [openReceivables, setOpenReceivables] = useState<any[]>([]);
  const [openPayables, setOpenPayables] = useState<any[]>([]);

  // Computed: suggestions separated by direction
  const receiveSuggestions = useMemo(
    () =>
      matchSuggestions.filter((s) => {
        if (s.systemTransaction) return s.systemTransaction.direction === "RECEIVE";
        return s.ofxTransaction.amount > 0;
      }),
    [matchSuggestions]
  );

  const paySuggestions = useMemo(
    () =>
      matchSuggestions.filter((s) => {
        if (s.systemTransaction) return s.systemTransaction.direction === "PAY";
        return s.ofxTransaction.amount < 0;
      }),
    [matchSuggestions]
  );

  const unmatchedReceiveTransactions = useMemo(
    () => unmatchedSystemTransactions.filter((t) => t.direction === "RECEIVE"),
    [unmatchedSystemTransactions]
  );

  const unmatchedPayTransactions = useMemo(
    () => unmatchedSystemTransactions.filter((t) => t.direction === "PAY"),
    [unmatchedSystemTransactions]
  );

  const fetchOpenTransactions = useCallback(async (
    accountId: string,
    startDate: string,
    endDate: string,
    includeOverdue: boolean,
    includeFuture: boolean,
  ) => {
    try {
      let query = supabase
        .from("financial_transactions")
        .select("id, description, amount, direction, due_date, paid_at, status")
        .eq("financial_account_id", accountId)
        .in("status", ["OPEN"] as any[]);

      // Build date filter based on flags
      if (!includeOverdue && !includeFuture) {
        // Only within OFX period
        query = query.gte("due_date", startDate).lte("due_date", endDate);
      } else if (includeOverdue && !includeFuture) {
        // Up to end of OFX period (includes overdue)
        query = query.lte("due_date", endDate);
      } else if (!includeOverdue && includeFuture) {
        // From start of OFX period onward (includes future)
        query = query.gte("due_date", startDate);
      }
      // If both true, no date filter — show all open

      const { data, error } = await query.order("due_date", { ascending: true });
      if (error) {
        console.error("Error fetching open transactions:", error);
        return;
      }

      setOpenReceivables((data || []).filter(t => t.direction === "RECEIVE"));
      setOpenPayables((data || []).filter(t => t.direction === "PAY"));
    } catch (e) {
      console.error("fetchOpenTransactions error:", e);
    }
  }, []);

  const parseOFXFile = useCallback(async (file: File): Promise<OFXStatement | null> => {
    setIsParsing(true);
    try {
      const content = await file.text();
      const statement = parseOFX(content);
      if (!statement) {
        toast.error("Não foi possível ler o arquivo OFX. Verifique se o formato está correto.");
        return null;
      }
      if (statement.transactions.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo OFX.");
        return null;
      }
      setOfxStatement(statement);
      toast.success(`${statement.transactions.length} transações encontradas no extrato.`);
      return statement;
    } catch (e) {
      console.error("Error parsing OFX:", e);
      toast.error("Erro ao processar o arquivo OFX.");
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const runAIMatching = useCallback(async (accountId: string, passedStatement?: OFXStatement) => {
    const statementToUse = passedStatement || ofxStatement;
    if (!statementToUse) {
      toast.error("Nenhum extrato carregado.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("reconcile-bank-statement", {
        body: {
          ofxTransactions: statementToUse.transactions,
          accountId,
          startDate: statementToUse.startDate,
          endDate: statementToUse.endDate,
        },
      });
      if (response.error) throw new Error(response.error.message);

      const { suggestions, systemTransactions } = response.data;
      const formattedSuggestions: MatchSuggestion[] = suggestions.map((s: any) => ({
        ...s,
        systemTransactions: s.systemTransaction ? [s.systemTransaction] : [],
        status: s.confidence >= 80 ? "pending" : s.systemTransaction ? "pending" : "manual",
      }));

      setMatchSuggestions(formattedSuggestions);

      const matchedIds = new Set(
        formattedSuggestions
          .filter((s: MatchSuggestion) => s.systemTransaction)
          .map((s: MatchSuggestion) => s.systemTransaction!.id)
      );
      const unmatched = systemTransactions.filter((t: any) => !matchedIds.has(t.id));
      setUnmatchedSystemTransactions(unmatched);

      const highConfidence = formattedSuggestions.filter((s: MatchSuggestion) => s.confidence >= 80).length;
      const lowConfidence = formattedSuggestions.filter(
        (s: MatchSuggestion) => s.confidence > 0 && s.confidence < 80
      ).length;
      const noMatch = formattedSuggestions.filter((s: MatchSuggestion) => !s.systemTransaction).length;

      toast.success(
        `Análise concluída! ${highConfidence} matches confiáveis, ${lowConfidence} para revisar, ${noMatch} sem correspondência.`
      );
    } catch (e) {
      console.error("AI matching error:", e);
      toast.error("Erro ao executar matching com IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [ofxStatement]);

  const updateSuggestionStatus = useCallback(
    (ofxFitId: string, status: MatchSuggestion["status"]) => {
      setMatchSuggestions((prev) =>
        prev.map((s) =>
          s.ofxTransaction.fitId === ofxFitId ? { ...s, status } : s
        )
      );
    },
    []
  );

  // Multi-match: assign multiple system transactions to one OFX item
  const reassignMultiMatch = useCallback(
    (ofxFitId: string, selectedSystemTxIds: string[]) => {
      setMatchSuggestions((prev) => {
        // Gather all system transactions from unmatched and from other suggestions
        const allSystemTxs: any[] = [...unmatchedSystemTransactions];
        for (const s of prev) {
          if (s.systemTransaction) allSystemTxs.push(s.systemTransaction);
          if (s.systemTransactions) allSystemTxs.push(...s.systemTransactions);
        }
        // Dedupe
        const txMap = new Map<string, any>();
        for (const tx of allSystemTxs) txMap.set(tx.id, tx);

        const selectedTxs = selectedSystemTxIds.map(id => txMap.get(id)).filter(Boolean);
        if (selectedTxs.length === 0) return prev;

        const currentSuggestion = prev.find((s) => s.ofxTransaction.fitId === ofxFitId);
        const oldTxIds = new Set(
          (currentSuggestion?.systemTransactions || (currentSuggestion?.systemTransaction ? [currentSuggestion.systemTransaction] : []))
            .map(t => t.id)
        );

        const updated = prev.map((s) => {
          if (s.ofxTransaction.fitId === ofxFitId) {
            return {
              ...s,
              systemTransaction: selectedTxs[0],
              systemTransactions: selectedTxs,
              confidence: 100,
              reason: "Match manual",
              status: "pending" as const,
            };
          }
          // Remove selected txs from other suggestions
          if (s.systemTransaction && selectedSystemTxIds.includes(s.systemTransaction.id)) {
            return {
              ...s,
              systemTransaction: null,
              systemTransactions: [],
              confidence: 0,
              reason: "Reatribuído manualmente",
              status: "manual" as const,
            };
          }
          return s;
        });

        // Update unmatched list: remove selected, add back old ones that aren't selected
        setUnmatchedSystemTransactions((prevUnmatched) => {
          let newUnmatched = prevUnmatched.filter(t => !selectedSystemTxIds.includes(t.id));
          // Add back old txs that were unselected
          for (const id of oldTxIds) {
            if (!selectedSystemTxIds.includes(id)) {
              const tx = txMap.get(id);
              if (tx) newUnmatched.push(tx);
            }
          }
          return newUnmatched;
        });

        return updated;
      });
    },
    [unmatchedSystemTransactions]
  );

  // Legacy single reassign (kept for compatibility)
  const reassignMatch = useCallback(
    (ofxFitId: string, newSystemTransactionId: string) => {
      reassignMultiMatch(ofxFitId, [newSystemTransactionId]);
    },
    [reassignMultiMatch]
  );

  const approveAll = useCallback(() => {
    setMatchSuggestions((prev) =>
      prev.map((s) =>
        s.systemTransaction && s.confidence >= 80 ? { ...s, status: "approved" } : s
      )
    );
  }, []);

  const approveAllByDirection = useCallback((direction: "RECEIVE" | "PAY") => {
    setMatchSuggestions((prev) =>
      prev.map((s) => {
        const isTargetDirection = s.systemTransaction
          ? s.systemTransaction.direction === direction
          : direction === "RECEIVE"
            ? s.ofxTransaction.amount > 0
            : s.ofxTransaction.amount < 0;

        if (isTargetDirection && s.systemTransaction && s.confidence >= 80) {
          return { ...s, status: "approved" };
        }
        return s;
      })
    );
  }, []);

  // Create manual financial transaction from OFX item
  const createManualTransaction = useCallback(async (
    ofxTransaction: OFXTransaction,
    accountId: string,
    categoryId: string,
    costCenterId?: string,
    description?: string,
  ) => {
    const direction = ofxTransaction.amount < 0 ? "PAY" : "RECEIVE";
    const amount = Math.abs(ofxTransaction.amount);
    const desc = description || `Conciliação bancária - ${ofxTransaction.description}`;

    const { error } = await supabase.from("financial_transactions").insert({
      direction,
      origin: "MANUAL" as any,
      status: "PAID" as any,
      amount,
      description: desc,
      due_date: ofxTransaction.date,
      paid_at: new Date(ofxTransaction.date + "T12:00:00").toISOString(),
      financial_account_id: accountId,
      category_id: categoryId,
      cost_center_id: costCenterId || null,
      is_reconciled: true,
      reconciled_at: new Date().toISOString(),
      bank_statement_ref: ofxTransaction.fitId,
    });

    if (error) {
      console.error("Error creating manual transaction:", error);
      toast.error("Erro ao incluir lançamento.");
      return false;
    }

    // Mark suggestion as included
    setMatchSuggestions((prev) =>
      prev.map((s) =>
        s.ofxTransaction.fitId === ofxTransaction.fitId
          ? { ...s, status: "included" as const }
          : s
      )
    );

    toast.success(`Lançamento incluído: ${desc}`);
    return true;
  }, []);

  const saveReconciliation = useCallback(async () => {
    const approved = matchSuggestions.filter(
      (s) => s.status === "approved" && (s.systemTransaction || (s.systemTransactions && s.systemTransactions.length > 0))
    );

    if (approved.length === 0) {
      toast.error("Nenhuma correspondência aprovada para salvar.");
      return;
    }

    setIsLoading(true);
    try {
      for (const match of approved) {
        const txsToReconcile = match.systemTransactions && match.systemTransactions.length > 0
          ? match.systemTransactions
          : match.systemTransaction ? [match.systemTransaction] : [];

        for (const tx of txsToReconcile) {
          const { error } = await supabase
            .from("financial_transactions")
            .update({
              is_reconciled: true,
              reconciled_at: new Date().toISOString(),
              bank_statement_ref: match.ofxTransaction.fitId,
            })
            .eq("id", tx.id);
          if (error) throw error;
        }
      }

      const totalTxs = approved.reduce((sum, m) => {
        const count = m.systemTransactions?.length || (m.systemTransaction ? 1 : 0);
        return sum + count;
      }, 0);

      toast.success(`${totalTxs} transações conciliadas com sucesso!`);
      setOfxStatement(null);
      setMatchSuggestions([]);
      setUnmatchedSystemTransactions([]);
    } catch (e) {
      console.error("Error saving reconciliation:", e);
      toast.error("Erro ao salvar conciliação.");
    } finally {
      setIsLoading(false);
    }
  }, [matchSuggestions]);

  const reset = useCallback(() => {
    setOfxStatement(null);
    setMatchSuggestions([]);
    setUnmatchedSystemTransactions([]);
    setOpenReceivables([]);
    setOpenPayables([]);
  }, []);

  return {
    isLoading,
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
    reassignMatch,
    reassignMultiMatch,
    approveAll,
    approveAllByDirection,
    saveReconciliation,
    createManualTransaction,
    reset,
  };
};
