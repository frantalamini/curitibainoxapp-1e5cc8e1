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
  confidence: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "manual";
}

export const useOFXReconciliation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [ofxStatement, setOfxStatement] = useState<OFXStatement | null>(null);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>([]);
  const [unmatchedSystemTransactions, setUnmatchedSystemTransactions] = useState<any[]>([]);

  // Computed: suggestions separated by direction
  const receiveSuggestions = useMemo(
    () =>
      matchSuggestions.filter((s) => {
        // OFX positive = RECEIVE; or matched system tx is RECEIVE
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

  // Unmatched system transactions separated by direction
  const unmatchedReceiveTransactions = useMemo(
    () => unmatchedSystemTransactions.filter((t) => t.direction === "RECEIVE"),
    [unmatchedSystemTransactions]
  );

  const unmatchedPayTransactions = useMemo(
    () => unmatchedSystemTransactions.filter((t) => t.direction === "PAY"),
    [unmatchedSystemTransactions]
  );

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

  const runAIMatching = useCallback(async (accountId: string) => {
    if (!ofxStatement) {
      toast.error("Nenhum extrato carregado.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("reconcile-bank-statement", {
        body: {
          ofxTransactions: ofxStatement.transactions,
          accountId,
          startDate: ofxStatement.startDate,
          endDate: ofxStatement.endDate,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { suggestions, systemTransactions } = response.data;

      // Convert to MatchSuggestion format with status
      const formattedSuggestions: MatchSuggestion[] = suggestions.map((s: any) => ({
        ...s,
        status: s.confidence >= 80 ? "pending" : s.systemTransaction ? "pending" : "manual",
      }));

      setMatchSuggestions(formattedSuggestions);

      // Find unmatched system transactions
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

  const reassignMatch = useCallback(
    (ofxFitId: string, newSystemTransactionId: string) => {
      setMatchSuggestions((prev) => {
        // Find the system transaction from unmatched list or from another suggestion
        let newSystemTx: MatchSuggestion["systemTransaction"] | null = null;

        // Check unmatched system transactions
        const fromUnmatched = unmatchedSystemTransactions.find(
          (t) => t.id === newSystemTransactionId
        );
        if (fromUnmatched) {
          newSystemTx = fromUnmatched;
        } else {
          // Check if it's currently assigned to another suggestion
          for (const s of prev) {
            if (s.systemTransaction?.id === newSystemTransactionId) {
              newSystemTx = s.systemTransaction;
              break;
            }
          }
        }

        if (!newSystemTx) return prev;

        // Get the old system transaction from the current suggestion to put back in unmatched
        const currentSuggestion = prev.find((s) => s.ofxTransaction.fitId === ofxFitId);
        const oldSystemTx = currentSuggestion?.systemTransaction;

        const updated = prev.map((s) => {
          if (s.ofxTransaction.fitId === ofxFitId) {
            return { ...s, systemTransaction: newSystemTx, confidence: 100, reason: "Match manual", status: "pending" as const };
          }
          // Remove from any other suggestion that had this system tx
          if (s.systemTransaction?.id === newSystemTransactionId) {
            return { ...s, systemTransaction: null, confidence: 0, reason: "Reatribuído manualmente", status: "manual" as const };
          }
          return s;
        });

        // Update unmatched list
        setUnmatchedSystemTransactions((prevUnmatched) => {
          let newUnmatched = prevUnmatched.filter((t) => t.id !== newSystemTransactionId);
          if (oldSystemTx) {
            newUnmatched = [...newUnmatched, oldSystemTx];
          }
          return newUnmatched;
        });

        return updated;
      });
    },
    [unmatchedSystemTransactions]
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

  const saveReconciliation = useCallback(async () => {
    const approved = matchSuggestions.filter(
      (s) => s.status === "approved" && s.systemTransaction
    );

    if (approved.length === 0) {
      toast.error("Nenhuma correspondência aprovada para salvar.");
      return;
    }

    setIsLoading(true);
    try {
      for (const match of approved) {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            is_reconciled: true,
            reconciled_at: new Date().toISOString(),
            bank_statement_ref: match.ofxTransaction.fitId,
          })
          .eq("id", match.systemTransaction!.id);

        if (error) throw error;
      }

      toast.success(`${approved.length} transações conciliadas com sucesso!`);
      
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
    parseOFXFile,
    runAIMatching,
    updateSuggestionStatus,
    reassignMatch,
    approveAll,
    approveAllByDirection,
    saveReconciliation,
    reset,
  };
};
