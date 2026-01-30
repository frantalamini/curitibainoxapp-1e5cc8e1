import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DRE_GROUPS, DRE_GROUP_LABELS, DREGroup } from "@/lib/dreConstants";
import { DRECategoryData, DRESectionTotals } from "@/hooks/useDREDataNew";

interface DRETableProps {
  isLoading: boolean;
  showMonthly: boolean;
  getCategoriesByGroup: (groups: DREGroup[]) => DRECategoryData[];
  faturamento: DRESectionTotals;
  cmv: DRESectionTotals;
  despesasVariaveis: DRESectionTotals;
  totalVariaveis: DRESectionTotals;
  margemContribuicao: DRESectionTotals;
  margemContribuicaoPct: { budgetMonth: number; realizedMonth: number; budgetYear: number; realizedYear: number };
  despesasFixas: DRESectionTotals;
  resultadoOperacional: DRESectionTotals;
  amortizacoes: DRESectionTotals;
  parcelamentoImpostos: DRESectionTotals;
  resultadoGlobal: DRESectionTotals;
  pontoEquilibrio: { budgetMonth: number; realizedMonth: number; budgetYear: number; realizedYear: number };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function getVarianceColor(budget: number, realized: number, isExpense: boolean = false) {
  const variance = realized - budget;
  if (Math.abs(variance) < 0.01) return "";
  
  if (isExpense) {
    // For expenses, less than budget is good (green), more is bad (red)
    return variance < 0 ? "text-green-600" : "text-red-600";
  } else {
    // For income, more than budget is good (green), less is bad (red)
    return variance > 0 ? "text-green-600" : "text-red-600";
  }
}

export function DRETable({
  isLoading,
  showMonthly,
  getCategoriesByGroup,
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
}: DRETableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const getBudget = (totals: DRESectionTotals) => 
    showMonthly ? totals.budgetMonth : totals.budgetYear;
  const getRealized = (totals: DRESectionTotals) => 
    showMonthly ? totals.realizedMonth : totals.realizedYear;

  const renderCategoryRows = (groups: DREGroup[], isExpense: boolean = false) => {
    const categories = getCategoriesByGroup(groups);
    
    if (categories.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center text-muted-foreground py-2 text-sm">
            Nenhuma categoria vinculada
          </TableCell>
        </TableRow>
      );
    }

    return categories.map((cat) => {
      const budget = showMonthly ? cat.budgetMonth : cat.budgetYear;
      const realized = showMonthly ? cat.realizedMonth : cat.realizedYear;
      const variancePct = budget > 0 ? ((realized - budget) / budget) * 100 : 0;

      return (
        <TableRow key={cat.categoryId} className="hover:bg-muted/30">
          <TableCell className="pl-8">{cat.categoryName}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(budget)}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(realized)}</TableCell>
          <TableCell className={cn("text-right font-mono", getVarianceColor(budget, realized, isExpense))}>
            {formatCurrency(realized - budget)}
          </TableCell>
          <TableCell className={cn("text-right font-mono text-sm", getVarianceColor(budget, realized, isExpense))}>
            {budget > 0 ? formatPercent(variancePct) : "-"}
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderSectionHeader = (title: string, bgClass: string = "bg-muted/50") => (
    <TableRow className={bgClass}>
      <TableCell colSpan={5} className="font-semibold">
        {title}
      </TableCell>
    </TableRow>
  );

  const renderSubtotalRow = (
    title: string, 
    totals: DRESectionTotals, 
    bgClass: string = "bg-muted/30",
    isExpense: boolean = false,
    isResult: boolean = false
  ) => {
    const budget = getBudget(totals);
    const realized = getRealized(totals);
    const variancePct = budget > 0 ? ((realized - budget) / budget) * 100 : 0;

    return (
      <TableRow className={cn(bgClass, "font-semibold")}>
        <TableCell>{title}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(budget)}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(realized)}</TableCell>
        <TableCell className={cn(
          "text-right font-mono",
          isResult ? getVarianceColor(budget, realized, false) : getVarianceColor(budget, realized, isExpense)
        )}>
          {formatCurrency(realized - budget)}
        </TableCell>
        <TableCell className={cn(
          "text-right font-mono text-sm",
          isResult ? getVarianceColor(budget, realized, false) : getVarianceColor(budget, realized, isExpense)
        )}>
          {budget > 0 ? formatPercent(variancePct) : "-"}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-primary/10">
          <TableHead className="w-[40%]">Descrição</TableHead>
          <TableHead className="text-right">Previsto</TableHead>
          <TableHead className="text-right">Realizado</TableHead>
          <TableHead className="text-right">Variação (R$)</TableHead>
          <TableHead className="text-right">Variação (%)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* 1. Faturamento/Receita */}
        {renderSectionHeader("1. Faturamento/Receita", "bg-green-50 dark:bg-green-950/30")}
        {renderCategoryRows([DRE_GROUPS.RECEITAS_VENDAS, DRE_GROUPS.RECEITAS_SERVICOS])}
        {renderSubtotalRow("Total Faturamento", faturamento, "bg-green-100 dark:bg-green-900/30")}

        {/* 2. Custo da Mercadoria */}
        {renderSectionHeader("2. Custo da Mercadoria Produzida/Vendida", "bg-orange-50 dark:bg-orange-950/30")}
        {renderCategoryRows([DRE_GROUPS.CMV_MERCADORIAS, DRE_GROUPS.CMV_SERVICOS], true)}
        {renderSubtotalRow("Total CMV", cmv, "bg-orange-100 dark:bg-orange-900/30", true)}

        {/* 3. Despesas Variáveis */}
        {renderSectionHeader("3. Despesas Variáveis", "bg-yellow-50 dark:bg-yellow-950/30")}
        {renderCategoryRows([DRE_GROUPS.DESPESAS_VARIAVEIS], true)}
        {renderSubtotalRow("Total Despesas Variáveis", despesasVariaveis, "bg-yellow-100 dark:bg-yellow-900/30", true)}

        {/* 4. Total de Variáveis */}
        {renderSubtotalRow("4. Total de Variáveis (2 + 3)", totalVariaveis, "bg-amber-200 dark:bg-amber-900/40", true)}

        {/* 5. Margem de Contribuição */}
        <TableRow className="bg-blue-100 dark:bg-blue-900/30 font-bold">
          <TableCell>5. Margem de Contribuição (1 - 4)</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(getBudget(margemContribuicao))}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(getRealized(margemContribuicao))}</TableCell>
          <TableCell className={cn("text-right font-mono", getVarianceColor(getBudget(margemContribuicao), getRealized(margemContribuicao)))}>
            {formatCurrency(getRealized(margemContribuicao) - getBudget(margemContribuicao))}
          </TableCell>
          <TableCell className="text-right font-mono">-</TableCell>
        </TableRow>
        <TableRow className="bg-blue-50 dark:bg-blue-950/20">
          <TableCell className="pl-8 italic">Margem de Contribuição %</TableCell>
          <TableCell className="text-right font-mono">
            {formatPercent(showMonthly ? margemContribuicaoPct.budgetMonth : margemContribuicaoPct.budgetYear)}
          </TableCell>
          <TableCell className="text-right font-mono">
            {formatPercent(showMonthly ? margemContribuicaoPct.realizedMonth : margemContribuicaoPct.realizedYear)}
          </TableCell>
          <TableCell className="text-right font-mono">-</TableCell>
          <TableCell className="text-right font-mono">-</TableCell>
        </TableRow>

        {/* 6. Despesas Fixas */}
        {renderSectionHeader("6. Despesas Fixas", "bg-red-50 dark:bg-red-950/30")}
        {renderCategoryRows([DRE_GROUPS.DESPESAS_FIXAS], true)}
        {renderSubtotalRow("Total Despesas Fixas", despesasFixas, "bg-red-100 dark:bg-red-900/30", true)}

        {/* 7. Resultado Operacional */}
        {renderSubtotalRow("7. Resultado Operacional (5 - 6)", resultadoOperacional, "bg-indigo-100 dark:bg-indigo-900/30", false, true)}

        {/* 8. Amortização de Empréstimos */}
        {renderSectionHeader("8. Amortização de Empréstimos", "bg-purple-50 dark:bg-purple-950/30")}
        {renderCategoryRows([DRE_GROUPS.AMORTIZACOES], true)}
        {renderSubtotalRow("Total Amortizações", amortizacoes, "bg-purple-100 dark:bg-purple-900/30", true)}

        {/* 9. Parcelamento de Impostos */}
        {renderSectionHeader("9. Parcelamento de Impostos", "bg-pink-50 dark:bg-pink-950/30")}
        {renderCategoryRows([DRE_GROUPS.PARCELAMENTO_IMPOSTOS], true)}
        {renderSubtotalRow("Total Parcelamento Impostos", parcelamentoImpostos, "bg-pink-100 dark:bg-pink-900/30", true)}

        {/* 10. Resultado Global */}
        <TableRow className={cn(
          "font-bold text-lg",
          getRealized(resultadoGlobal) >= 0 ? "bg-green-200 dark:bg-green-800/40" : "bg-red-200 dark:bg-red-800/40"
        )}>
          <TableCell>10. RESULTADO GLOBAL (7 - 8 - 9)</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(getBudget(resultadoGlobal))}</TableCell>
          <TableCell className="text-right font-mono">{formatCurrency(getRealized(resultadoGlobal))}</TableCell>
          <TableCell className={cn("text-right font-mono", getVarianceColor(getBudget(resultadoGlobal), getRealized(resultadoGlobal)))}>
            {formatCurrency(getRealized(resultadoGlobal) - getBudget(resultadoGlobal))}
          </TableCell>
          <TableCell className="text-right font-mono">-</TableCell>
        </TableRow>

        {/* Ponto de Equilíbrio */}
        <TableRow className="bg-gray-100 dark:bg-gray-800/30">
          <TableCell colSpan={5} className="h-4" />
        </TableRow>
        <TableRow className="bg-slate-200 dark:bg-slate-700/40 font-semibold">
          <TableCell>PONTO DE EQUILÍBRIO</TableCell>
          <TableCell className="text-right font-mono">
            {formatCurrency(showMonthly ? pontoEquilibrio.budgetMonth : pontoEquilibrio.budgetYear)}
          </TableCell>
          <TableCell className="text-right font-mono">
            {formatCurrency(showMonthly ? pontoEquilibrio.realizedMonth : pontoEquilibrio.realizedYear)}
          </TableCell>
          <TableCell colSpan={2} className="text-muted-foreground text-sm">
            Faturamento sem Lucro nem Prejuízo
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
