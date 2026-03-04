

## Plano: Carregar Contas a Receber e a Pagar nos Painéis Laterais

### Problema
Os painéis "Contas a Receber" e "Contas a Pagar" mostram apenas transações PAGAS não conciliadas retornadas pela edge function. Mas o usuário precisa ver as transações **em aberto** (OPEN/PENDING) do sistema — incluindo vencidas e futuras — para poder vinculá-las manualmente aos itens do extrato OFX.

### Solução

**1. Buscar transações abertas no client-side** (`useOFXReconciliation.ts`)
- Adicionar uma função `fetchOpenTransactions(accountId, startDate, endDate, includeOverdue, includeFuture)` que busca `financial_transactions` com `status != 'PAID'` (ou seja, OPEN/PENDING)
- Separar em `openReceivables` (direction=RECEIVE) e `openPayables` (direction=PAY)
- Parâmetros de filtro: período do OFX + flags para incluir vencidos e futuros

**2. Adicionar filtros de período nos painéis** (`ConciliacaoBancaria.tsx`)
- Cada painel lateral ganha dois toggles/checkboxes: "Incluir vencidos" e "Incluir futuros"
- Por padrão ambos ativados (pois pagamentos podem ser adiantados ou atrasados)
- Ao alterar, refaz a query

**3. Tornar transações dos painéis laterais "arrastáveis" para o matching**
- Cada item nos painéis laterais terá um botão de ação para vincular ao item OFX selecionado
- Reutilizar o `MultiSelectReassignPopover` já existente, alimentando-o com as transações abertas em vez de apenas as unmatched do AI

**4. Atualizar edge function** (`reconcile-bank-statement/index.ts`)
- Além de PAID+não conciliadas, também buscar transações OPEN/PENDING para o matching da IA
- Isso permite que a IA sugira matches com transações que ainda não foram pagas

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOFXReconciliation.ts` | Nova query `fetchOpenTransactions`, novos states `openReceivables`/`openPayables` |
| `src/pages/financas/ConciliacaoBancaria.tsx` | Painéis laterais usam transações abertas, filtros vencido/futuro, alimentar reassign popover |
| `supabase/functions/reconcile-bank-statement/index.ts` | Incluir transações OPEN no matching da IA |

### Impacto
- Nenhum outro arquivo alterado
- Fluxo de caixa, DRE, permissões inalterados

