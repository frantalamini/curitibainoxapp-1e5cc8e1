
# Plano: Sincronizacao Definitiva entre Financeiro da OS e Contas a Receber

## Resumo

Garantir que ao salvar o Financeiro da OS, todas as parcelas sejam automaticamente sincronizadas com a tabela `financial_transactions`, que e a fonte unica de dados para Contas a Receber. A sincronizacao sera feita atraves de uma operacao idempotente de "delete + recreate" que garante consistencia absoluta.

## Situacao Atual

A tabela `financial_transactions` ja e usada como fonte unica de dados, porem:

1. O botao "Gerar Parcelas" faz delete + create corretamente
2. Edicoes individuais (valor, data, forma) sao salvas imediatamente via `updateTransaction`
3. O botao "Salvar Financeiro" apenas atualiza metadados na OS (descontos, config), mas NAO garante sincronizacao completa
4. Nao ha invalidacao cruzada do cache de `receivables` apos operacoes

## Arquitetura da Solucao

```text
+--------------------------------------------------+
|              FinanceiroTab.tsx                   |
|                                                  |
|  [Gerar Parcelas] --> doGenerateInstallments()   |
|       - Delete existentes                        |
|       - Create novas parcelas                    |
|       - Invalidar cache receivables              |
|                                                  |
|  [Salvar Financeiro] --> handleSaveFinancial()   |
|       - Validar parcelas                         |
|       - Atualizar installments_total             |
|       - Salvar config na OS                      |
|       - Invalidar cache receivables              |
|       - Toast "Contas a receber atualizadas"     |
|       - NAO navegar / NAO fechar                 |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
|           financial_transactions                 |
| (direction='RECEIVE', origin='SERVICE_CALL')     |
|                                                  |
| Campos: id, service_call_id, client_id,          |
|         installment_number, due_date, amount,    |
|         payment_method, status, paid_at, notes   |
+--------------------------------------------------+
                       |
                       v
+--------------------------------------------------+
|             ContasAReceber.tsx                   |
| (useReceivables - filtra direction='RECEIVE')    |
|                                                  |
| - Listar parcelas com filtros                    |
| - Marcar como PAGO (nao editar valor/data)       |
| - Visualizar origem da OS                        |
+--------------------------------------------------+
```

## Implementacao Detalhada

### 1. Atualizar hook useFinancialTransactions

**Arquivo:** `src/hooks/useFinancialTransactions.ts`

Adicionar invalidacao cruzada do cache `receivables` em todas as mutations:

- `createTransaction.onSuccess`: invalidar `["receivables"]`
- `createManyTransactions.onSuccess`: invalidar `["receivables"]`
- `updateTransaction.onSuccess`: invalidar `["receivables"]`
- `markAsPaid.onSuccess`: invalidar `["receivables"]`
- `cancelTransaction.onSuccess`: invalidar `["receivables"]`
- `deleteTransaction.onSuccess`: invalidar `["receivables"]`

Isso garante que qualquer alteracao nas transacoes da OS reflita imediatamente no Contas a Receber.

### 2. Atualizar funcao handleSaveFinancial

**Arquivo:** `src/components/os-financeiro/FinanceiroTab.tsx`

Modificar a funcao `handleSaveFinancial` para:

1. **Validar parcelas**: Verificar se todas tem data e valor validos
2. **Atualizar installments_total**: Para cada parcela, garantir que o total de parcelas esteja correto
3. **Salvar config na OS**: Atualizar descontos e configuracao de pagamento
4. **Invalidar cache de receivables**: Forcar refresh no Contas a Receber
5. **Toast de sucesso**: Exibir "Contas a receber atualizadas"
6. **NAO navegar**: Manter usuario na mesma tela

### 3. Ajustar Contas a Receber

**Arquivo:** `src/pages/financas/ContasAReceber.tsx`

Adicionar indicador visual para parcelas originadas de OS (origin='SERVICE_CALL'):

- Tooltip ou icone indicando que valor/data so podem ser editados na OS
- Manter apenas acao de "Marcar como Pago" e "Cancelar"
- Exibir coluna de "Observacao" (notes)
- Exibir coluna de "Forma Pgto" (payment_method)

### 4. Fluxo de Sincronizacao Garantido

| Acao do Usuario | Comportamento | Resultado no Contas a Receber |
|-----------------|---------------|-------------------------------|
| Gerar Parcelas | Delete + Create | Parcelas aparecem imediatamente |
| Editar parcela inline | Update imediato | Valores atualizados em tempo real |
| Adicionar parcela manual | Create | Nova parcela visivel |
| Excluir parcela | Delete | Parcela removida |
| Salvar Financeiro | Valida + Atualiza totais | Cache invalidado, dados sincronizados |
| Limpar Parcelas | Delete all | Zera parcelas daquela OS |

## Detalhes Tecnicos

### Arquivo: src/hooks/useFinancialTransactions.ts

**Mudancas:**

```typescript
// Em todas as mutations, adicionar no onSuccess:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["financial-transactions", serviceCallId] });
  queryClient.invalidateQueries({ queryKey: ["receivables"] }); // NOVO
},
```

### Arquivo: src/components/os-financeiro/FinanceiroTab.tsx

**Mudancas na funcao handleSaveFinancial:**

```typescript
const handleSaveFinancial = async () => {
  // 1. Validar parcelas
  const invalidParcels = transactions.filter(t => !t.due_date || t.amount <= 0);
  if (invalidParcels.length > 0) {
    toast({ title: "Parcelas com dados invalidos", variant: "destructive" });
    return;
  }

  setIsSaving(true);
  try {
    // 2. Atualizar installments_total em todas as parcelas
    const currentTotal = transactions.length;
    for (const t of transactions) {
      if (t.installments_total !== currentTotal) {
        await updateTransaction.mutateAsync({
          id: t.id,
          installments_total: currentTotal,
        });
      }
    }

    // 3. Salvar configuracao na OS
    const paymentConfig = buildPaymentConfig(...);
    await supabase.from("service_calls").update({
      discount_total_type: osDiscountType,
      discount_total_value: osDiscountValue,
      payment_config: paymentConfig,
    }).eq("id", serviceCallId);

    // 4. Invalidar cache de receivables
    queryClient.invalidateQueries({ queryKey: ["receivables"] });

    // 5. Toast de sucesso (NAO navegar)
    toast({ title: "Contas a receber atualizadas" });
  } catch (error) {
    toast({ title: "Erro ao salvar", variant: "destructive" });
  } finally {
    setIsSaving(false);
  }
};
```

### Arquivo: src/pages/financas/ContasAReceber.tsx

**Mudancas:**

1. Adicionar coluna "Forma Pgto" na tabela
2. Adicionar coluna "Observacao" na tabela
3. Adicionar indicador visual para parcelas de OS (icone/tooltip)
4. Desabilitar edicao de valor/data para origin='SERVICE_CALL'

## Arquivos a Modificar

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/hooks/useFinancialTransactions.ts` | Adicionar invalidacao de `receivables` em todas as mutations |
| `src/components/os-financeiro/FinanceiroTab.tsx` | Atualizar `handleSaveFinancial` para sincronizar totais e invalidar cache |
| `src/pages/financas/ContasAReceber.tsx` | Adicionar colunas Forma Pgto e Observacao; indicador visual para parcelas de OS |

## Criterios de Aceite

| Criterio | Como sera validado |
|----------|-------------------|
| Criar OS + salvar financeiro = parcelas em Contas a Receber | Parcelas com direction=RECEIVE aparecem apos save |
| Editar parcelas na OS = Contas a Receber atualiza | Cache invalidado apos cada operacao |
| Excluir parcelas na OS = Contas a Receber reflete | Delete remove da tabela, receivables recarrega |
| Salvar nao fecha tela | Usuario permanece na aba Financeiro |
| Sem duplicacao apos multiplos saves | Operacoes idempotentes garantem unicidade |
| Tecnico nao ve valores | FinanceiroGuard ja implementado (nao sera alterado) |
| Admin ve tudo | RLS existente permite (nao sera alterado) |

## Observacoes Importantes

- O botao "Salvar Financeiro" NAO navegara nem fechara a tela
- A estrutura de menu lateral ja existe conforme solicitado
- Nenhuma nova tabela sera criada - usaremos `financial_transactions` existente
- A RLS existente ja protege os dados (apenas admin acessa transacoes financeiras)
- Nao serao alterados: layout global, autenticacao, permissoes, abas existentes, FinanceiroGuard, rotas
