

## Análise do Problema

### Por que "Nenhum lançamento" nos painéis laterais

Confirmei no banco: existem **34 contas a receber em aberto** e **2 contas a pagar em aberto**, porém **todas as 34 receivables não têm `financial_account_id` definido**. A query atual filtra por `.eq("financial_account_id", accountId)`, então retorna zero resultados.

Isso acontece porque quando a OS é faturada e gera parcelas no `financial_transactions`, o campo `financial_account_id` não é preenchido (a conta bancária só é definida quando o pagamento é efetivamente conciliado/liquidado). Logo, o filtro por conta está errado para buscar transações em aberto.

### Melhorias solicitadas (referência Tela 2 - Time Olist)

O usuário quer que ao clicar num item OFX, os painéis laterais mostrem transações filtráveis por **período (De/Até)** com campos de data, em vez de apenas checkboxes "Vencidos/Futuros".

---

## Plano de Correções

### 1. Remover filtro por `financial_account_id` nas transações OPEN (`useOFXReconciliation.ts`)

Transações em aberto (não pagas) não têm conta bancária definida. O filtro correto é buscar **todas as transações OPEN**, independente da conta, filtrando apenas por direção e período.

Manter o filtro por conta apenas para transações PAID (já conciliadas/liquidadas).

### 2. Substituir checkboxes por date pickers nos painéis laterais (`ConciliacaoBancaria.tsx`)

Trocar os checkboxes "Vencidos" e "Futuros" por dois campos de data **"De" e "Até"**, inicializados com o período do extrato OFX mas editáveis pelo usuário. Assim o usuário controla exatamente o intervalo de busca, como na referência do Time Olist.

- Painel Contas a Receber: campos `De` / `Até` próprios
- Painel Contas a Pagar: campos `De` / `Até` próprios

### 3. Atualizar `fetchOpenTransactions` para aceitar datas customizadas

A função passa a receber `startDate` e `endDate` diretamente (sem flags booleanas), e remove o filtro por `financial_account_id` para transações OPEN.

### 4. Edge function: também buscar transações sem conta

No `reconcile-bank-statement/index.ts`, a query de system transactions também filtra por `financial_account_id`. Precisa incluir transações OPEN sem conta para que a IA consiga sugerir matches.

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOFXReconciliation.ts` | Remover filtro `financial_account_id` para OPEN; simplificar params de data |
| `src/pages/financas/ConciliacaoBancaria.tsx` | Trocar checkboxes por date pickers De/Até nos painéis; state de datas separado por painel |
| `supabase/functions/reconcile-bank-statement/index.ts` | Incluir transações OPEN sem conta no pool de matching da IA |

