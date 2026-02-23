

## Conciliacao Bancaria Redesenhada -- Tela Unica com Separacao Contas a Pagar / Contas a Receber

### Problema Atual

A conciliacao bancaria atual funciona dentro de um Dialog (popup), mostra todas as transacoes em uma unica tabela sem separacao entre entradas e saidas, e nao permite alterar a sugestao de match facilmente. O usuario precisa de uma experiencia em tela cheia, com divisao visual clara entre Contas a Pagar e Contas a Receber, com sugestoes de IA ja pre-carregadas e editaveis inline.

### O Que Sera Feito

1. **Redesenhar a tela de Conciliacao Bancaria** removendo o Dialog e trazendo todo o fluxo OFX para a propria pagina
2. **Dividir a tela em duas abas** (ou duas secoes): "Contas a Receber" e "Contas a Pagar"
3. **Cada secao mostra lado a lado**: transacao do extrato OFX (esquerda) e a sugestao do sistema (direita)
4. **Permitir alterar o match** inline com um seletor de transacoes do sistema, sem sair da tela
5. **Manter o fluxo atual de summary cards e movimentacao por conta** na parte superior da pagina

### Fluxo do Usuario

1. Seleciona a conta bancaria no topo da pagina
2. Clica em "Importar OFX" e seleciona o arquivo
3. O arquivo e parseado e automaticamente a IA e acionada
4. A tela se divide em duas abas: "Recebimentos" e "Pagamentos"
5. Cada aba mostra as transacoes do extrato com a sugestao de match do sistema
6. O usuario pode aprovar, rejeitar, ou trocar o match por outra transacao do sistema (via dropdown inline)
7. Ao final, salva todas as conciliacoes aprovadas de uma vez

### Detalhes Tecnicos

**Arquivos modificados:**

- `src/pages/financas/ConciliacaoBancaria.tsx` -- Redesign completo da secao de conciliacao OFX (removendo Dialog, trazendo para a pagina principal com Tabs Receber/Pagar)
- `src/hooks/useOFXReconciliation.ts` -- Adicionar separacao das sugestoes por direction (RECEIVE/PAY) e adicionar funcao para trocar o match manualmente (vincular outra transacao do sistema a uma linha do OFX)
- `supabase/functions/reconcile-bank-statement/index.ts` -- Retornar as transacoes do sistema separadas por direction para facilitar o agrupamento no frontend

**Mudancas na pagina `ConciliacaoBancaria.tsx`:**

- Remover o `Dialog` de OFX e trazer o conteudo para a pagina principal (abaixo dos summary cards)
- Quando o OFX e importado, exibir um componente com `Tabs` ("Recebimentos" e "Pagamentos")
- Cada aba contem uma tabela com colunas:
  - Extrato (descricao, data, valor do OFX)
  - Sugestao do Sistema (descricao, vencimento, valor)
  - Confianca (badge verde/amarelo/cinza)
  - Status (aprovado/rejeitado/pendente)
  - Acoes (aprovar, rejeitar, trocar match)
- O botao "Trocar match" abre um dropdown/popover inline com a lista de transacoes do sistema nao conciliadas daquela direction, permitindo selecionar outra sem sair da tela
- Botao "Aprovar todos com alta confianca" por aba
- Botao "Salvar conciliacao" no rodape da secao

**Mudancas no hook `useOFXReconciliation.ts`:**

- Adicionar propriedades computadas `receiveSuggestions` e `paySuggestions` que filtram matchSuggestions por direction
- Adicionar funcao `reassignMatch(ofxFitId, newSystemTransactionId)` que troca o match de uma transacao OFX para outra transacao do sistema
- Expor `unmatchedSystemTransactions` separados por direction

**Mudancas na Edge Function `reconcile-bank-statement`:**

- Retornar `systemTransactions` ja com o campo `direction` para que o frontend possa separar
- Nenhuma mudanca na logica de IA, apenas garantir que o response inclui a direction de cada transacao

### O Que NAO Sera Alterado

- Nenhuma tabela no banco de dados
- Nenhuma rota do sistema
- Nenhum outro componente ou pagina
- Os summary cards e a secao "Movimentacao por Conta" continuam identicos
- O parser OFX (`src/lib/ofxParser.ts`) permanece inalterado
- A logica de salvamento (marcar `is_reconciled`, `reconciled_at`, `bank_statement_ref`) permanece a mesma

