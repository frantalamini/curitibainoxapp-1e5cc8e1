

## Plano: Conciliação Inline nos Painéis + Cliente + Confirmação + Desfazer

### Resumo dos pedidos

1. **Selecionar para conciliar direto no painel lateral** — ao clicar no ícone circular (reassign) de um item OFX, em vez de abrir popover separado, habilitar radio/checkbox de seleção nos itens do painel Contas a Receber/Pagar correspondente, permitindo marcar ali mesmo
2. **Mostrar nome do cliente** nas transações dos painéis laterais (hoje mostra apenas "Sem descrição" e valor)
3. **Botão "Incluir" com confirmação** — ao clicar em "Incluir", abrir modal de lançamento e antes de salvar perguntar "Tem certeza que deseja fazer inclusão manual?"
4. **Botão "Desfazer"** — tanto para conciliações salvas quanto para inclusões manuais, permitir reverter

---

### Alterações por arquivo

#### 1. `src/hooks/useOFXReconciliation.ts`
- **Incluir `client_id` e join com `clients`** na query `fetchOpenTransactions`:
  ```sql
  .select("id, description, amount, direction, due_date, status, client_id, clients(full_name, secondary_name)")
  ```
- **Adicionar função `undoReconciliation(transactionId)`**: faz update `is_reconciled=false, reconciled_at=null, bank_statement_ref=null` e atualiza estado local
- **Adicionar função `undoManualInclusion(fitId)`**: busca transação pelo `bank_statement_ref=fitId` e deleta, depois atualiza status da suggestion de volta para "manual"
- Na edge function query também incluir client join para que o AI matching retorne o nome do cliente

#### 2. `src/pages/financas/ConciliacaoBancaria.tsx`

**SystemTransactionsPanel — modo seleção inline:**
- Adicionar props: `selectionMode: boolean`, `selectedIds: string[]`, `onToggleSelect: (id: string) => void`
- Quando `selectionMode=true`, cada item do painel mostra um Checkbox ao lado
- No header do painel, quando em modo seleção, mostrar um botão "Confirmar (N)" para aplicar a seleção
- Estado de "qual OFX está sendo conciliado" gerenciado no componente pai

**Exibir nome do cliente:**
- No render de cada transação, mostrar `t.clients?.full_name` acima ou ao lado da descrição

**ConciliationPanel — botão conciliar inline:**
- O ícone circular (RefreshCw do MultiSelectReassignPopover) passa a ativar o modo seleção no painel lateral correspondente (Receber ou Pagar) em vez de abrir popover
- Manter o popover como fallback caso haja transações de ambas direções

**Botão Incluir com confirmação:**
- Após preencher o `ManualIncludeModal`, ao clicar "Incluir", exibir AlertDialog: "Tem certeza que deseja fazer inclusão manual deste lançamento?" com botões Cancelar/Confirmar

**Botão Desfazer:**
- Em itens com status "approved" ou "included", mostrar botão "Desfazer" que:
  - Para "approved": reverte status para "pending"
  - Para "included" (já salvo no banco): chama `undoManualInclusion` para deletar a transação criada

#### 3. `supabase/functions/reconcile-bank-statement/index.ts`
- Incluir join com `clients(full_name)` na query de system transactions para que o nome do cliente venha junto nas sugestões da IA

#### 4. `src/components/conciliacao/ManualIncludeModal.tsx`
- Adicionar AlertDialog de confirmação antes de executar o `onConfirm`

---

### Fluxo do usuário (resultado final)

1. Importa OFX → painéis laterais mostram contas a receber/pagar com **nome do cliente** e valor
2. No painel central, clica no ícone de conciliar de um item OFX crédito → painel "Contas a Receber" entra em **modo seleção** com checkboxes
3. Marca um ou mais itens no painel → clica "Confirmar" → match é aplicado como "pending"
4. Aprova → status vira "approved" → aparece botão **"Desfazer"** caso mude de ideia
5. Clica "Incluir" em item sem correspondência → preenche categoria → **confirmação** "Tem certeza?" → salva
6. Item incluído mostra botão **"Desfazer"** que deleta a transação criada

### Arquivos alterados
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOFXReconciliation.ts` | Join com clients, undo functions |
| `src/pages/financas/ConciliacaoBancaria.tsx` | Modo seleção inline, cliente nos itens, desfazer |
| `src/components/conciliacao/ManualIncludeModal.tsx` | AlertDialog de confirmação |
| `supabase/functions/reconcile-bank-statement/index.ts` | Join com clients na query |

