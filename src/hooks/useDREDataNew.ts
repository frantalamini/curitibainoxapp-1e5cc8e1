import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategoryBudgets } from "./useCategoryBudgets";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { DRE_GROUPS, DREGroup } from "@/lib/dreConstants";

interface CategoryWithDRE {
  id: string;
  name: string;
  type: "income" | "expense";
  dre_group: DREGroup | null;
}

interface Transaction {
  id: string;
  amount: number;
  status: string | null;
  due_date: string;
  paid_at: string | null;
  category_id: string | null;
}

export interface DRECategoryData {
  categoryId: string;
  categoryName: string;
  dreGroup: DREGroup | null;
  budgetMonth: number;
  realizedMonth: number;
  budgetYear: number;
  realizedYear: number;
}

export interface DRESectionTotals {
  budgetMonth: number;
  realizedMonth: number;
  budgetYear: number;
  realizedYear: number;
}

export const useDREDataNew = (month: number, year: number) => {
  const { getBudget, getYearBudget, isLoading: budgetsLoading } = useCategoryBudgets(year);

  const monthStart = format(startOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");
  const yearStart = format(startOfYear(new Date(year, 0)), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(new Date(year, 0)), "yyyy-MM-dd");

  // Fetch categories with DRE group
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["dre-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("id, name, type, dre_group")
        .eq("is_active", true);

      if (error) throw error;
      return data as CategoryWithDRE[];
    },
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["dre-transactions-new", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, amount, status, due_date, paid_at, category_id")
        .neq("status", "CANCELED")
        .gte("due_date", yearStart)
        .lte("due_date", yearEnd);

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const isLoading = budgetsLoading || categoriesLoading || transactionsLoading;

  // Calculate data per category
  const categoryData: DRECategoryData[] = categories.map((category) => {
    const categoryTransactions = transactions.filter(
      (t) => t.category_id === category.id
    );

    // Monthly realized (PAID with paid_at in month)
    const realizedMonth = categoryTransactions
      .filter((t) => {
        if (t.status !== "PAID" || !t.paid_at) return false;
        const paidDate = t.paid_at.split("T")[0];
        return paidDate >= monthStart && paidDate <= monthEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Yearly realized (PAID with paid_at in year)
    const realizedYear = categoryTransactions
      .filter((t) => {
        if (t.status !== "PAID" || !t.paid_at) return false;
        const paidDate = t.paid_at.split("T")[0];
        return paidDate >= yearStart && paidDate <= yearEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      categoryId: category.id,
      categoryName: category.name,
      dreGroup: category.dre_group as DREGroup | null,
      budgetMonth: getBudget(category.id, month),
      realizedMonth,
      budgetYear: getYearBudget(category.id),
      realizedYear,
    };
  });

  // Group data by DRE group
  const getCategoriesByGroup = (groups: DREGroup[]): DRECategoryData[] => {
    return categoryData.filter((c) => c.dreGroup && groups.includes(c.dreGroup));
  };

  const getSectionTotals = (groups: DREGroup[]): DRESectionTotals => {
    const items = getCategoriesByGroup(groups);
    return {
      budgetMonth: items.reduce((sum, c) => sum + c.budgetMonth, 0),
      realizedMonth: items.reduce((sum, c) => sum + c.realizedMonth, 0),
      budgetYear: items.reduce((sum, c) => sum + c.budgetYear, 0),
      realizedYear: items.reduce((sum, c) => sum + c.realizedYear, 0),
    };
  };

  // Calculate section totals
  const faturamento = getSectionTotals([DRE_GROUPS.RECEITAS_VENDAS, DRE_GROUPS.RECEITAS_SERVICOS]);
  const cmv = getSectionTotals([DRE_GROUPS.CMV_MERCADORIAS, DRE_GROUPS.CMV_SERVICOS]);
  const despesasVariaveis = getSectionTotals([DRE_GROUPS.DESPESAS_VARIAVEIS]);
  const despesasFixas = getSectionTotals([DRE_GROUPS.DESPESAS_FIXAS]);
  const amortizacoes = getSectionTotals([DRE_GROUPS.AMORTIZACOES]);
  const parcelamentoImpostos = getSectionTotals([DRE_GROUPS.PARCELAMENTO_IMPOSTOS]);

  // Calculated totals
  const totalVariaveis: DRESectionTotals = {
    budgetMonth: cmv.budgetMonth + despesasVariaveis.budgetMonth,
    realizedMonth: cmv.realizedMonth + despesasVariaveis.realizedMonth,
    budgetYear: cmv.budgetYear + despesasVariaveis.budgetYear,
    realizedYear: cmv.realizedYear + despesasVariaveis.realizedYear,
  };

  const margemContribuicao: DRESectionTotals = {
    budgetMonth: faturamento.budgetMonth - totalVariaveis.budgetMonth,
    realizedMonth: faturamento.realizedMonth - totalVariaveis.realizedMonth,
    budgetYear: faturamento.budgetYear - totalVariaveis.budgetYear,
    realizedYear: faturamento.realizedYear - totalVariaveis.realizedYear,
  };

  const margemContribuicaoPct = {
    budgetMonth: faturamento.budgetMonth > 0 
      ? (margemContribuicao.budgetMonth / faturamento.budgetMonth) * 100 
      : 0,
    realizedMonth: faturamento.realizedMonth > 0 
      ? (margemContribuicao.realizedMonth / faturamento.realizedMonth) * 100 
      : 0,
    budgetYear: faturamento.budgetYear > 0 
      ? (margemContribuicao.budgetYear / faturamento.budgetYear) * 100 
      : 0,
    realizedYear: faturamento.realizedYear > 0 
      ? (margemContribuicao.realizedYear / faturamento.realizedYear) * 100 
      : 0,
  };

  const resultadoOperacional: DRESectionTotals = {
    budgetMonth: margemContribuicao.budgetMonth - despesasFixas.budgetMonth,
    realizedMonth: margemContribuicao.realizedMonth - despesasFixas.realizedMonth,
    budgetYear: margemContribuicao.budgetYear - despesasFixas.budgetYear,
    realizedYear: margemContribuicao.realizedYear - despesasFixas.realizedYear,
  };

  const resultadoGlobal: DRESectionTotals = {
    budgetMonth: resultadoOperacional.budgetMonth - amortizacoes.budgetMonth - parcelamentoImpostos.budgetMonth,
    realizedMonth: resultadoOperacional.realizedMonth - amortizacoes.realizedMonth - parcelamentoImpostos.realizedMonth,
    budgetYear: resultadoOperacional.budgetYear - amortizacoes.budgetYear - parcelamentoImpostos.budgetYear,
    realizedYear: resultadoOperacional.realizedYear - amortizacoes.realizedYear - parcelamentoImpostos.realizedYear,
  };

  // Ponto de equilíbrio (Break-even point)
  // Fórmula: Despesas Fixas / Margem de Contribuição %
  const pontoEquilibrio = {
    budgetMonth: margemContribuicaoPct.budgetMonth > 0 
      ? (despesasFixas.budgetMonth + amortizacoes.budgetMonth + parcelamentoImpostos.budgetMonth) / (margemContribuicaoPct.budgetMonth / 100)
      : 0,
    realizedMonth: margemContribuicaoPct.realizedMonth > 0 
      ? (despesasFixas.realizedMonth + amortizacoes.realizedMonth + parcelamentoImpostos.realizedMonth) / (margemContribuicaoPct.realizedMonth / 100)
      : 0,
    budgetYear: margemContribuicaoPct.budgetYear > 0 
      ? (despesasFixas.budgetYear + amortizacoes.budgetYear + parcelamentoImpostos.budgetYear) / (margemContribuicaoPct.budgetYear / 100)
      : 0,
    realizedYear: margemContribuicaoPct.realizedYear > 0 
      ? (despesasFixas.realizedYear + amortizacoes.realizedYear + parcelamentoImpostos.realizedYear) / (margemContribuicaoPct.realizedYear / 100)
      : 0,
  };

  return {
    isLoading,
    categoryData,
    categories,
    getCategoriesByGroup,
    getSectionTotals,
    // Section totals
    faturamento,
    cmv,
    despesasVariaveis,
    totalVariaveis,
    margemContribuicao,
    margemContribuicaoPct,
    despesasFixas,
    resultadoOperacional,
    amortizacoes,
    parcelamentoImpostos,
    resultadoGlobal,
    pontoEquilibrio,
  };
};
