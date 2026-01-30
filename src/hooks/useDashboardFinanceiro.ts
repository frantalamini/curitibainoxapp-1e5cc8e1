import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, startOfYear, endOfYear } from "date-fns";

interface MonthlyData {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  profit: number;
}

interface AccountsStatus {
  receivableOpen: number;
  receivableOverdue: number;
  payableOpen: number;
  payableOverdue: number;
}

export const useDashboardFinanceiro = () => {
  const today = new Date();
  const currentMonthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(today), "yyyy-MM-dd");
  const yearStart = format(startOfYear(today), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(today), "yyyy-MM-dd");

  // Fetch all transactions for the year
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["dashboard-financeiro-transactions", yearStart, yearEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, amount, direction, status, due_date, paid_at")
        .neq("status", "CANCELED")
        .gte("due_date", yearStart)
        .lte("due_date", yearEnd);

      if (error) throw error;
      return data;
    },
  });

  // Calculate current month KPIs (realized - PAID)
  const currentMonthIncome = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "RECEIVE") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= currentMonthStart && paidDate <= currentMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthExpense = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "PAY") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= currentMonthStart && paidDate <= currentMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthProfit = currentMonthIncome - currentMonthExpense;
  const currentMonthMargin = currentMonthIncome > 0 
    ? (currentMonthProfit / currentMonthIncome) * 100 
    : 0;

  // Calculate YTD KPIs
  const ytdIncome = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "RECEIVE") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= yearStart && paidDate <= currentMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const ytdExpense = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "PAY") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= yearStart && paidDate <= currentMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const ytdProfit = ytdIncome - ytdExpense;
  const ytdMargin = ytdIncome > 0 ? (ytdProfit / ytdIncome) * 100 : 0;

  // Calculate monthly trend (last 6 months)
  const monthlyTrend: MonthlyData[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
    const monthKey = format(monthDate, "yyyy-MM");
    const monthLabel = format(monthDate, "MMM");

    const income = transactions
      .filter((t) => {
        if (t.status !== "PAID" || !t.paid_at || t.direction !== "RECEIVE") return false;
        const paidDate = t.paid_at.split("T")[0];
        return paidDate >= monthStart && paidDate <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => {
        if (t.status !== "PAID" || !t.paid_at || t.direction !== "PAY") return false;
        const paidDate = t.paid_at.split("T")[0];
        return paidDate >= monthStart && paidDate <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    monthlyTrend.push({
      month: monthKey,
      monthLabel,
      income,
      expense,
      profit: income - expense,
    });
  }

  // Accounts status
  const todayStr = format(today, "yyyy-MM-dd");
  
  const accountsStatus: AccountsStatus = {
    receivableOpen: transactions
      .filter((t) => t.direction === "RECEIVE" && t.status === "OPEN" && t.due_date >= todayStr)
      .reduce((sum, t) => sum + t.amount, 0),
    receivableOverdue: transactions
      .filter((t) => t.direction === "RECEIVE" && t.status === "OPEN" && t.due_date < todayStr)
      .reduce((sum, t) => sum + t.amount, 0),
    payableOpen: transactions
      .filter((t) => t.direction === "PAY" && t.status === "OPEN" && t.due_date >= todayStr)
      .reduce((sum, t) => sum + t.amount, 0),
    payableOverdue: transactions
      .filter((t) => t.direction === "PAY" && t.status === "OPEN" && t.due_date < todayStr)
      .reduce((sum, t) => sum + t.amount, 0),
  };

  // Previous month comparison
  const prevMonthDate = subMonths(today, 1);
  const prevMonthStart = format(startOfMonth(prevMonthDate), "yyyy-MM-dd");
  const prevMonthEnd = format(endOfMonth(prevMonthDate), "yyyy-MM-dd");

  const prevMonthIncome = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "RECEIVE") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= prevMonthStart && paidDate <= prevMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const prevMonthExpense = transactions
    .filter((t) => {
      if (t.status !== "PAID" || !t.paid_at || t.direction !== "PAY") return false;
      const paidDate = t.paid_at.split("T")[0];
      return paidDate >= prevMonthStart && paidDate <= prevMonthEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeChange = prevMonthIncome > 0 
    ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100 
    : 0;
  const expenseChange = prevMonthExpense > 0 
    ? ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100 
    : 0;

  return {
    isLoading: transactionsLoading,
    // Current month
    currentMonthIncome,
    currentMonthExpense,
    currentMonthProfit,
    currentMonthMargin,
    // YTD
    ytdIncome,
    ytdExpense,
    ytdProfit,
    ytdMargin,
    // Trend
    monthlyTrend,
    // Accounts status
    accountsStatus,
    // Comparison
    incomeChange,
    expenseChange,
  };
};
