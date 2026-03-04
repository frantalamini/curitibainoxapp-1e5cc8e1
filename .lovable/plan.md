

## Plano: Evolucao da Conciliacao Bancaria

A pagina `ConciliacaoBancaria.tsx` ja existe com importacao OFX, matching por IA e aprovacao. O plano abaixo adiciona as funcionalidades solicitadas sem alterar nenhuma outra pagina/hook existente.

---

### 1. Botao "Incluir" para lancamentos sem correspondencia

**Problema:** Transacoes do extrato como tarifas e juros nao possuem correspondencia no sistema. O usuario precisa inclui-las diretamente.

**Solucao:** Adicionar um botao "Incluir" em cada linha da tabela de conciliacao que tenha `status: "manual"` (sem correspondencia). Ao clicar:
- Abre um mini-formulario inline ou modal simples com:
  - Categoria financeira (select das `financial_categories`)
  - Centro de custo (opcional)
  - Descricao pre-preenchida com a descricao do OFX
  - Valor pre-preenchido do OFX
- Ao confirmar, cria um `financial_transaction` com:
  - `direction`: PAY (se OFX negativo) ou RECEIVE (se positivo)
  - `origin`: MANUAL
  - `status`: PAID
  - `paid_at`: data da transacao OFX
  - `due_date`: data da transacao OFX
  - `financial_account_id`: conta selecionada
  - `is_reconciled`: true
  - `reconciled_at`: now()
  - `bank_statement_ref`: fitId do OFX
  - `description`: "Conciliacao bancaria - {descricao OFX}"

**Arquivos:** `src/pages/financas/ConciliacaoBancaria.tsx`, `src/hooks/useOFXReconciliation.ts`

### 2. Layout de 3 paineis (Contas a Receber, Contas a Pagar, Conciliacao)

**Problema:** Atualmente usa tabs que alternam entre Recebimentos e Pagamentos. O usuario quer ver tudo ao mesmo tempo.

**Solucao:** Substituir as Tabs por um layout de 3 colunas (em tela grande) ou empilhado (mobile):
- Coluna esquerda: **Contas a Receber** (transacoes RECEIVE nao conciliadas do sistema para o periodo)
- Coluna direita: **Contas a Pagar** (transacoes PAY nao conciliadas do sistema para o periodo)
- Coluna central: **Conciliacao Sugerida** (matches da IA + items sem match com botao Incluir)

Usando `react-resizable-panels` (ja instalado) para permitir redimensionar.

**Arquivos:** `src/pages/financas/ConciliacaoBancaria.tsx`

### 3. Matching muitos-para-muitos (1 OFX -> N sistema e vice-versa)

**Problema:** Atualmente o matching e 1:1. O usuario precisa vincular 1 debito do extrato a varios lancamentos do sistema.

**Solucao:** 
- No `ReassignPopover`, permitir selecao multipla de transacoes do sistema (checkboxes em vez de click unico)
- A soma dos valores selecionados e exibida em tempo real
- Ao confirmar, o match armazena um array de `systemTransactionIds` em vez de um unico ID
- No `saveReconciliation`, marcar todos os system transactions vinculados como reconciliados

**Arquivos:** `src/hooks/useOFXReconciliation.ts`, `src/pages/financas/ConciliacaoBancaria.tsx`

### 4. Inclusao manual vai para "Realizado" no Fluxo de Caixa

**Problema:** Lancamentos criados via conciliacao precisam aparecer como realizados no fluxo de caixa.

**Solucao:** Ja resolvido pela arquitetura atual. O hook `useCashFlow` busca transacoes com `status: PAID` e `paid_at` preenchido. Como as inclusoes manuais da conciliacao ja serao criadas com `status: PAID` e `paid_at` = data OFX, elas automaticamente aparecem no realizado. Nenhuma alteracao necessaria no fluxo de caixa.

### 5. Restricao de acesso (apenas Gerencial)

**Problema:** Garantir que apenas perfil gerencial acessa a conciliacao bancaria.

**Solucao:** A pagina ja esta dentro do menu Financas que e restrito a admins. A edge function `reconcile-bank-statement` ja valida `isAdmin`. Nenhuma alteracao necessaria - o acesso ja esta protegido.

---

### Resumo de arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/financas/ConciliacaoBancaria.tsx` | Layout 3 paineis, botao Incluir, multi-select no reassign |
| `src/hooks/useOFXReconciliation.ts` | Funcao `createManualTransaction`, suporte multi-match |

### Nenhuma migration necessaria
Todas as colunas necessarias ja existem na tabela `financial_transactions`.

### Impacto zero em funcionalidades existentes
- Nenhum outro arquivo sera modificado
- Fluxo de caixa, contas a pagar/receber, DRE continuam intactos
- Permissoes e RLS inalteradas

