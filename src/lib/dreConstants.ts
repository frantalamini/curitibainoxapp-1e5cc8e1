// DRE Groups following the standard structure
export const DRE_GROUPS = {
  // 1. Faturamento/Receita
  RECEITAS_VENDAS: "receitas_vendas",
  RECEITAS_SERVICOS: "receitas_servicos",
  
  // 2. Custo da Mercadoria
  CMV_MERCADORIAS: "cmv_mercadorias",
  CMV_SERVICOS: "cmv_servicos",
  
  // 3. Despesas Variáveis
  DESPESAS_VARIAVEIS: "despesas_variaveis",
  
  // 6. Despesas Fixas
  DESPESAS_FIXAS: "despesas_fixas",
  
  // 8. Amortização de Empréstimos
  AMORTIZACOES: "amortizacoes",
  
  // 9. Parcelamento de Impostos
  PARCELAMENTO_IMPOSTOS: "parcelamento_impostos",
} as const;

export type DREGroup = typeof DRE_GROUPS[keyof typeof DRE_GROUPS];

export const DRE_GROUP_LABELS: Record<DREGroup, string> = {
  [DRE_GROUPS.RECEITAS_VENDAS]: "Vendas",
  [DRE_GROUPS.RECEITAS_SERVICOS]: "Serviços",
  [DRE_GROUPS.CMV_MERCADORIAS]: "Custo Mercadorias Vendidas",
  [DRE_GROUPS.CMV_SERVICOS]: "Custo Serviços",
  [DRE_GROUPS.DESPESAS_VARIAVEIS]: "Despesas Variáveis",
  [DRE_GROUPS.DESPESAS_FIXAS]: "Despesas Fixas",
  [DRE_GROUPS.AMORTIZACOES]: "Amortização de Empréstimos",
  [DRE_GROUPS.PARCELAMENTO_IMPOSTOS]: "Parcelamento de Impostos",
};

export const DRE_GROUP_OPTIONS = Object.entries(DRE_GROUP_LABELS).map(
  ([value, label]) => ({ value, label })
);

// Structure for DRE display
export interface DRESection {
  id: string;
  title: string;
  groups: DREGroup[];
  isSubtotal?: boolean;
  formula?: string;
}

export const DRE_STRUCTURE: DRESection[] = [
  {
    id: "faturamento",
    title: "1. Faturamento/Receita",
    groups: [DRE_GROUPS.RECEITAS_VENDAS, DRE_GROUPS.RECEITAS_SERVICOS],
  },
  {
    id: "cmv",
    title: "2. Custo da Mercadoria Produzida/Vendida",
    groups: [DRE_GROUPS.CMV_MERCADORIAS, DRE_GROUPS.CMV_SERVICOS],
  },
  {
    id: "despesas_variaveis",
    title: "3. Despesas Variáveis",
    groups: [DRE_GROUPS.DESPESAS_VARIAVEIS],
  },
  {
    id: "total_variaveis",
    title: "4. Total de Variáveis (2 + 3)",
    groups: [],
    isSubtotal: true,
    formula: "cmv + despesas_variaveis",
  },
  {
    id: "margem_contribuicao",
    title: "5. Margem de Contribuição (1 - 4)",
    groups: [],
    isSubtotal: true,
    formula: "faturamento - total_variaveis",
  },
  {
    id: "despesas_fixas",
    title: "6. Despesas Fixas",
    groups: [DRE_GROUPS.DESPESAS_FIXAS],
  },
  {
    id: "resultado_operacional",
    title: "7. Resultado Operacional (5 - 6)",
    groups: [],
    isSubtotal: true,
    formula: "margem_contribuicao - despesas_fixas",
  },
  {
    id: "amortizacoes",
    title: "8. Amortização de Empréstimos",
    groups: [DRE_GROUPS.AMORTIZACOES],
  },
  {
    id: "parcelamento_impostos",
    title: "9. Parcelamento de Impostos",
    groups: [DRE_GROUPS.PARCELAMENTO_IMPOSTOS],
  },
  {
    id: "resultado_global",
    title: "10. RESULTADO GLOBAL (7 - 8 - 9)",
    groups: [],
    isSubtotal: true,
    formula: "resultado_operacional - amortizacoes - parcelamento_impostos",
  },
];
