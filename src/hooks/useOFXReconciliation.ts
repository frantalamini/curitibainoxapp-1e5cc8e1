import { useState, useCallback } from "react";
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

  const approveAll = useCallback(() => {
    setMatchSuggestions((prev) =>
      prev.map((s) =>
        s.systemTransaction && s.confidence >= 80 ? { ...s, status: "approved" } : s
      )
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
      // Update each approved transaction as reconciled
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
      
      // Clear state
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
    unmatchedSystemTransactions,
    parseOFXFile,
    runAIMatching,
    updateSuggestionStatus,
    approveAll,
    saveReconciliation,
    reset,
  };
};
