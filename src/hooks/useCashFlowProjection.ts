import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialAccounts } from "./useFinancialAccounts";
import { format, addDays, parseISO, isBefore, isEqual, addMonths, endOfMonth } from "date-fns";

export interface ProjectedBalance {
  date: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  isProjected: boolean;
  hasNegativeBalance: boolean;
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

interface RecurringTransaction {
  id: string;
  amount: number;
  direction: "RECEIVE" | "PAY";
  day_of_month: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  financial_account_id: string | null;
}

export const useCashFlowProjection = (
  accountId: string | null,
  projectionMonths: number = 3
) => {
  const { accounts, isLoading: accountsLoading } = useFinancialAccounts();

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = endOfMonth(addMonths(today, projectionMonths));

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["cash-flow-projection-transactions", accountId, startDate.toISOString(), endDate.toISOString()],
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

  const { data: recurringTransactions = [], isLoading: recurringLoading } = useQuery({
    queryKey: ["cash-flow-projection-recurring", accountId],
    queryFn: async () => {
      let query = supabase
        .from("recurring_transactions")
        .select("id, amount, direction, day_of_month, is_active, start_date, end_date, financial_account_id")
        .eq("is_active", true);

      if (accountId && accountId !== "all") {
        query = query.eq("financial_account_id", accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RecurringTransaction[];
    },
  });

  const calculateProjectedBalances = (): ProjectedBalance[] => {
    if (accountsLoading || transactionsLoading || recurringLoading) return [];

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

    // Calculate accumulated balance from movements before start date (realized only)
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

    // Generate recurring projections for future months
    const recurringProjections = new Map<string, { income: number; expense: number }>();
    
    const todayStr = format(today, "yyyy-MM-dd");
    let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    while (isBefore(currentMonth, addDays(endDate, 1))) {
      const monthEnd = endOfMonth(currentMonth);
      
      recurringTransactions.forEach(rt => {
        const rtStartDate = parseISO(rt.start_date);
        const rtEndDate = rt.end_date ? parseISO(rt.end_date) : null;
        
        // Check if recurring is active for this month
        if (isBefore(monthEnd, rtStartDate)) return;
        if (rtEndDate && isBefore(rtEndDate, currentMonth)) return;
        
        const dueDay = Math.min(rt.day_of_month, monthEnd.getDate());
        const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDay);
        const dueDateStr = format(dueDate, "yyyy-MM-dd");
        
        // Only project future dates
        if (dueDateStr <= todayStr) return;
        
        // Check if transaction already exists for this due date
        const existsInTransactions = transactions.some(t => 
          t.due_date === dueDateStr && 
          Math.abs(t.amount - rt.amount) < 0.01 &&
          t.direction === rt.direction
        );
        
        if (existsInTransactions) return;
        
        const existing = recurringProjections.get(dueDateStr) || { income: 0, expense: 0 };
        if (rt.direction === "RECEIVE") {
          existing.income += rt.amount;
        } else {
          existing.expense += rt.amount;
        }
        recurringProjections.set(dueDateStr, existing);
      });
      
      currentMonth = addMonths(currentMonth, 1);
    }

    // Generate daily balances
    const dailyBalances: ProjectedBalance[] = [];
    let currentDate = new Date(startDate);

    while (isBefore(currentDate, addDays(endDate, 1))) {
      const dayStr = format(currentDate, "yyyy-MM-dd");
      const isProjected = dayStr > todayStr;

      // Income from transactions
      let income = 0;
      let expense = 0;

      if (isProjected) {
        // Future: use pending transactions
        income = transactions
          .filter(t => t.direction === "RECEIVE" && t.status === "OPEN" && t.due_date === dayStr)
          .reduce((sum, t) => sum + t.amount, 0);
        
        expense = transactions
          .filter(t => t.direction === "PAY" && t.status === "OPEN" && t.due_date === dayStr)
          .reduce((sum, t) => sum + t.amount, 0);
        
        // Add recurring projections
        const recurring = recurringProjections.get(dayStr);
        if (recurring) {
          income += recurring.income;
          expense += recurring.expense;
        }
      } else {
        // Past/Today: use realized transactions
        income = transactions
          .filter(t => {
            if (t.direction !== "RECEIVE" || t.status !== "PAID" || !t.paid_at) return false;
            return t.paid_at.split("T")[0] === dayStr;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        expense = transactions
          .filter(t => {
            if (t.direction !== "PAY" || t.status !== "PAID" || !t.paid_at) return false;
            return t.paid_at.split("T")[0] === dayStr;
          })
          .reduce((sum, t) => sum + t.amount, 0);
      }

      const closingBalance = accumulatedBalance + income - expense;

      dailyBalances.push({
        date: dayStr,
        openingBalance: accumulatedBalance,
        income,
        expense,
        closingBalance,
        isProjected,
        hasNegativeBalance: closingBalance < 0,
      });

      accumulatedBalance = closingBalance;
      currentDate = addDays(currentDate, 1);
    }

    return dailyBalances;
  };

  const projectedBalances = calculateProjectedBalances();

  // Find first date with negative balance
  const firstNegativeDate = projectedBalances.find(p => p.hasNegativeBalance)?.date || null;

  // Calculate summary
  const summary = {
    currentBalance: projectedBalances.find(p => p.date === format(today, "yyyy-MM-dd"))?.closingBalance ?? 0,
    projectedEndBalance: projectedBalances[projectedBalances.length - 1]?.closingBalance ?? 0,
    totalProjectedIncome: projectedBalances.filter(p => p.isProjected).reduce((sum, p) => sum + p.income, 0),
    totalProjectedExpense: projectedBalances.filter(p => p.isProjected).reduce((sum, p) => sum + p.expense, 0),
    hasNegativeProjection: projectedBalances.some(p => p.hasNegativeBalance),
    firstNegativeDate,
    lowestBalance: Math.min(...projectedBalances.map(p => p.closingBalance)),
  };

  return {
    projectedBalances,
    summary,
    accounts,
    isLoading: accountsLoading || transactionsLoading || recurringLoading,
  };
};
