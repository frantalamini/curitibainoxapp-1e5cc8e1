import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialAccounts, FinancialAccount } from "./useFinancialAccounts";
import { format, addDays, parseISO, isBefore, isEqual } from "date-fns";

export interface DailyBalance {
  date: string;
  openingBalance: number;
  expectedIncome: number;
  expectedExpense: number;
  realizedIncome: number;
  realizedExpense: number;
  expectedClosing: number;
  realizedClosing: number;
}

interface Transaction {
  id: string;
  amount: number;
  direction: "RECEIVE" | "PAY";
  status: "OPEN" | "PAID" | "CANCELED" | "PARTIAL";
  due_date: string;
  paid_at: string | null;
  financial_account_id: string | null;
}

export const useCashFlow = (
  accountId: string | null,
  startDate: Date,
  endDate: Date
) => {
  const { accounts, isLoading: accountsLoading } = useFinancialAccounts();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["cash-flow-transactions", accountId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select("id, amount, direction, status, due_date, paid_at, financial_account_id")
        .neq("status", "CANCELED");

      if (accountId && accountId !== "all") {
        query = query.eq("financial_account_id", accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const calculateDailyBalances = (): DailyBalance[] => {
    if (accountsLoading || transactionsLoading) return [];

    // Get selected account(s)
    const selectedAccounts = accountId && accountId !== "all"
      ? accounts.filter(a => a.id === accountId)
      : accounts.filter(a => a.is_active);

    if (selectedAccounts.length === 0) return [];

    // Calculate base opening balance from all selected accounts
    const baseOpeningBalance = selectedAccounts.reduce((sum, acc) => sum + acc.opening_balance, 0);
    
    // Find earliest opening_balance_date
    const earliestDate = selectedAccounts.reduce((earliest, acc) => {
      const accDate = parseISO(acc.opening_balance_date);
      return isBefore(accDate, earliest) ? accDate : earliest;
    }, parseISO(selectedAccounts[0].opening_balance_date));

    // Calculate accumulated balance from movements before start date
    const dayBeforeStart = addDays(startDate, -1);
    const movementsBefore = transactions.filter(t => {
      if (t.status !== "PAID" || !t.paid_at) return false;
      const paidDate = parseISO(t.paid_at.split("T")[0]);
      return (
        (isBefore(earliestDate, paidDate) || isEqual(earliestDate, paidDate)) &&
        isBefore(paidDate, startDate)
      );
    });

    let accumulatedBalance = baseOpeningBalance;
    movementsBefore.forEach(t => {
      if (t.direction === "RECEIVE") {
        accumulatedBalance += t.amount;
      } else {
        accumulatedBalance -= t.amount;
      }
    });

    // Generate daily balances
    const dailyBalances: DailyBalance[] = [];
    let currentDate = new Date(startDate);

    while (isBefore(currentDate, addDays(endDate, 1))) {
      const dayStr = format(currentDate, "yyyy-MM-dd");

      // Expected income: AR with due_date on this day and status OPEN
      const expectedIncome = transactions
        .filter(t =>
          t.direction === "RECEIVE" &&
          t.status === "OPEN" &&
          t.due_date === dayStr
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // Expected expense: AP with due_date on this day and status OPEN
      const expectedExpense = transactions
        .filter(t =>
          t.direction === "PAY" &&
          t.status === "OPEN" &&
          t.due_date === dayStr
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // Realized income: AR with paid_at on this day
      const realizedIncome = transactions
        .filter(t => {
          if (t.direction !== "RECEIVE" || t.status !== "PAID" || !t.paid_at) return false;
          return t.paid_at.split("T")[0] === dayStr;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Realized expense: AP with paid_at on this day
      const realizedExpense = transactions
        .filter(t => {
          if (t.direction !== "PAY" || t.status !== "PAID" || !t.paid_at) return false;
          return t.paid_at.split("T")[0] === dayStr;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      dailyBalances.push({
        date: dayStr,
        openingBalance: accumulatedBalance,
        expectedIncome,
        expectedExpense,
        realizedIncome,
        realizedExpense,
        expectedClosing: accumulatedBalance + expectedIncome - expectedExpense,
        realizedClosing: accumulatedBalance + realizedIncome - realizedExpense,
      });

      // Next day: opening balance = realized closing of current day
      accumulatedBalance = accumulatedBalance + realizedIncome - realizedExpense;
      currentDate = addDays(currentDate, 1);
    }

    return dailyBalances;
  };

  const dailyBalances = calculateDailyBalances();

  // Calculate period summary
  const summary = {
    initialBalance: dailyBalances[0]?.openingBalance ?? 0,
    totalExpectedIncome: dailyBalances.reduce((sum, d) => sum + d.expectedIncome, 0),
    totalExpectedExpense: dailyBalances.reduce((sum, d) => sum + d.expectedExpense, 0),
    totalRealizedIncome: dailyBalances.reduce((sum, d) => sum + d.realizedIncome, 0),
    totalRealizedExpense: dailyBalances.reduce((sum, d) => sum + d.realizedExpense, 0),
    finalExpectedBalance: dailyBalances[dailyBalances.length - 1]?.expectedClosing ?? 0,
    finalRealizedBalance: dailyBalances[dailyBalances.length - 1]?.realizedClosing ?? 0,
  };

  return {
    dailyBalances,
    summary,
    accounts,
    isLoading: accountsLoading || transactionsLoading,
  };
};
