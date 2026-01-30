import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreditCard {
  id: string;
  name: string;
  card_brand: string | null;
  last_digits: string | null;
  credit_limit: number;
  due_day: number; // dia do vencimento da fatura
  closing_day: number; // dia de corte/fechamento
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInsert {
  name: string;
  card_brand?: string | null;
  last_digits?: string | null;
  credit_limit?: number;
  due_day: number;
  closing_day: number;
}

export interface CreditCardUpdate extends Partial<CreditCardInsert> {
  is_active?: boolean;
}

/**
 * Calcula a data de vencimento da fatura para uma compra feita em determinada data
 * Se a compra foi feita antes do dia de corte, vai para a fatura do mês atual
 * Se foi feita depois do corte, vai para a fatura do próximo mês
 */
export function calculateStatementDate(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
): Date {
  const purchaseDay = purchaseDate.getDate();
  const purchaseMonth = purchaseDate.getMonth();
  const purchaseYear = purchaseDate.getFullYear();

  let statementMonth = purchaseMonth;
  let statementYear = purchaseYear;

  // Se a compra foi feita após o dia de corte, vai para a próxima fatura
  if (purchaseDay > closingDay) {
    statementMonth += 1;
    if (statementMonth > 11) {
      statementMonth = 0;
      statementYear += 1;
    }
  }

  // A data de vencimento é no mês seguinte ao fechamento
  let dueMonth = statementMonth + 1;
  let dueYear = statementYear;
  if (dueMonth > 11) {
    dueMonth = 0;
    dueYear += 1;
  }

  // Ajusta se o dia de vencimento não existe no mês (ex: dia 31 em fevereiro)
  const lastDayOfMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
  const adjustedDueDay = Math.min(dueDay, lastDayOfMonth);

  return new Date(dueYear, dueMonth, adjustedDueDay);
}

/**
 * Retorna o período de compras (início e fim) para uma fatura com determinada data de vencimento
 */
export function getStatementPeriod(
  statementDueDate: Date,
  closingDay: number
): { start: Date; end: Date } {
  // O mês de compras é o mês anterior ao vencimento
  let purchaseMonth = statementDueDate.getMonth() - 1;
  let purchaseYear = statementDueDate.getFullYear();
  if (purchaseMonth < 0) {
    purchaseMonth = 11;
    purchaseYear -= 1;
  }

  // Início: dia após o corte do mês anterior
  let startMonth = purchaseMonth - 1;
  let startYear = purchaseYear;
  if (startMonth < 0) {
    startMonth = 11;
    startYear -= 1;
  }
  const startDay = closingDay + 1;
  const lastDayOfStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
  
  const start = new Date(startYear, startMonth, Math.min(startDay, lastDayOfStartMonth));
  
  // Fim: dia do corte do mês de compras
  const lastDayOfPurchaseMonth = new Date(purchaseYear, purchaseMonth + 1, 0).getDate();
  const end = new Date(purchaseYear, purchaseMonth, Math.min(closingDay, lastDayOfPurchaseMonth));

  return { start, end };
}

export function useCreditCards() {
  const queryClient = useQueryClient();

  const { data: creditCards = [], isLoading, error } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as CreditCard[];
    },
  });

  const createCreditCard = useMutation({
    mutationFn: async (card: CreditCardInsert) => {
      const { data, error } = await supabase
        .from("credit_cards")
        .insert({
          name: card.name,
          card_brand: card.card_brand || null,
          last_digits: card.last_digits || null,
          credit_limit: card.credit_limit || 0,
          due_day: card.due_day,
          closing_day: card.closing_day,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Cartão de crédito criado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar cartão: ${error.message}`);
    },
  });

  const updateCreditCard = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & CreditCardUpdate) => {
      const { data, error } = await supabase
        .from("credit_cards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Cartão atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cartão: ${error.message}`);
    },
  });

  const deleteCreditCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_cards")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      toast.success("Cartão excluído!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir cartão: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("credit_cards")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    creditCards,
    activeCards: creditCards.filter((c) => c.is_active),
    isLoading,
    error,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    toggleActive,
  };
}
