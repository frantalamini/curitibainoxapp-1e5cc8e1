import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialCategories } from "./useFinancialCategories";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";

interface CategorySummary {
  categoryId: string;
  categoryName: string;
  type: "income" | "expense";
  expectedMonth: number;
  realizedMonth: number;
  expectedYear: number;
  realizedYear: number;
}

interface DRETotals {
  totalIncomeExpectedMonth: number;
  totalIncomeRealizedMonth: number;
  totalExpenseExpectedMonth: number;
  totalExpenseRealizedMonth: number;
  netExpectedMonth: number;
  netRealizedMonth: number;
  totalIncomeExpectedYear: number;
  totalIncomeRealizedYear: number;
  totalExpenseExpectedYear: number;
  totalExpenseRealizedYear: number;
  netExpectedYear: number;
  netRealizedYear: number;
}

export const useDREData = (month: number, year: number) => {
  const { categories, isLoading: categoriesLoading } = useFinancialCategories();

  const monthStart = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const yearStart = format(startOfYear(new Date(year, 0)), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(new Date(year, 0)), "yyyy-MM-dd");

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["dre-transactions", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, amount, direction, status, due_date, paid_at, category_id")
        .neq("status", "CANCELED")
        .gte("due_date", yearStart)
        .lte("due_date", yearEnd);

      if (error) throw error;
      return data;
    },
  });

  const calculateCategorySummaries = (): CategorySummary[] => {
    if (categoriesLoading || transactionsLoading) return [];

    return categories.map(category => {
      const categoryTransactions = transactions.filter(t => t.category_id === category.id);

      // Monthly expected (OPEN with due_date in month)
      const expectedMonth = categoryTransactions
        .filter(t => t.status === "OPEN" && t.due_date >= monthStart && t.due_date <= monthEnd)
        .reduce((sum, t) => sum + t.amount, 0);

      // Monthly realized (PAID with paid_at in month)
      const realizedMonth = categoryTransactions
        .filter(t => {
          if (t.status !== "PAID" || !t.paid_at) return false;
          const paidDate = t.paid_at.split("T")[0];
          return paidDate >= monthStart && paidDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      // Yearly expected (OPEN with due_date in year)
      const expectedYear = categoryTransactions
        .filter(t => t.status === "OPEN" && t.due_date >= yearStart && t.due_date <= yearEnd)
        .reduce((sum, t) => sum + t.amount, 0);

      // Yearly realized (PAID with paid_at in year)
      const realizedYear = categoryTransactions
        .filter(t => {
          if (t.status !== "PAID" || !t.paid_at) return false;
          const paidDate = t.paid_at.split("T")[0];
          return paidDate >= yearStart && paidDate <= yearEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        categoryId: category.id,
        categoryName: category.name,
        type: category.type as "income" | "expense",
        expectedMonth,
        realizedMonth,
        expectedYear,
        realizedYear,
      };
    });
  };

  const categorySummaries = calculateCategorySummaries();

  const incomeSummaries = categorySummaries.filter(c => c.type === "income");
  const expenseSummaries = categorySummaries.filter(c => c.type === "expense");

  const totals: DRETotals = {
    totalIncomeExpectedMonth: incomeSummaries.reduce((sum, c) => sum + c.expectedMonth, 0),
    totalIncomeRealizedMonth: incomeSummaries.reduce((sum, c) => sum + c.realizedMonth, 0),
    totalExpenseExpectedMonth: expenseSummaries.reduce((sum, c) => sum + c.expectedMonth, 0),
    totalExpenseRealizedMonth: expenseSummaries.reduce((sum, c) => sum + c.realizedMonth, 0),
    netExpectedMonth: 0,
    netRealizedMonth: 0,
    totalIncomeExpectedYear: incomeSummaries.reduce((sum, c) => sum + c.expectedYear, 0),
    totalIncomeRealizedYear: incomeSummaries.reduce((sum, c) => sum + c.realizedYear, 0),
    totalExpenseExpectedYear: expenseSummaries.reduce((sum, c) => sum + c.expectedYear, 0),
    totalExpenseRealizedYear: expenseSummaries.reduce((sum, c) => sum + c.realizedYear, 0),
    netExpectedYear: 0,
    netRealizedYear: 0,
  };

  totals.netExpectedMonth = totals.totalIncomeExpectedMonth - totals.totalExpenseExpectedMonth;
  totals.netRealizedMonth = totals.totalIncomeRealizedMonth - totals.totalExpenseRealizedMonth;
  totals.netExpectedYear = totals.totalIncomeExpectedYear - totals.totalExpenseExpectedYear;
  totals.netRealizedYear = totals.totalIncomeRealizedYear - totals.totalExpenseRealizedYear;

  return {
    categorySummaries,
    incomeSummaries,
    expenseSummaries,
    totals,
    isLoading: categoriesLoading || transactionsLoading,
  };
};
