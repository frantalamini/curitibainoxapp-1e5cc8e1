

## Editar Descrição de Itens ja Lançados no Financeiro da OS

### Problema

Atualmente, os itens de Servicos (e Pecas) lançados na aba Financeiro da OS sao somente leitura. Para alterar qualquer campo (descricao, quantidade, valor, desconto), o usuario precisa excluir o item e incluir novamente.

### O Que Sera Feito

Tornar os campos dos itens ja lancados **editaveis inline** (clicando no valor para editar), tanto na tabela de **Servicos** quanto na de **Pecas/Produtos**. Os campos editaveis serao: Descricao, Qtd, Valor Unitario, %Desc e R$Desc. O total sera recalculado automaticamente ao salvar.

### Como Vai Funcionar

1. O usuario clica em qualquer campo de um item ja lancado (descricao, qtd, unit, desconto)
2. A linha entra em modo de edicao: os campos viram inputs editaveis
3. Dois botoes aparecem na linha: Salvar (check) e Cancelar (X)
4. Ao salvar, o sistema recalcula o total do item e atualiza no banco via `updateItem`
5. Ao cancelar, a linha volta ao modo leitura sem alteracoes

### Detalhes Tecnicos

**Arquivo unico alterado**: `src/components/os-financeiro/FinanceiroTab.tsx`

1. Adicionar estado `editingItemId` e estados temporarios (`editItemDescription`, `editItemQty`, `editItemUnitPrice`, `editItemDiscountType`, `editItemDiscountPercent`, `editItemDiscountValue`)
2. Na tabela de Servicos (linhas ~782-812), quando `editingItemId === item.id`, renderizar inputs em vez de texto estatico
3. Na tabela de Pecas (linhas ~648-682), mesma logica -- descricao nao editavel (vem do produto), mas Qtd, Unit e Descontos sim
4. Funcao `handleStartEditItem(item)` preenche os estados temporarios
5. Funcao `handleSaveEditItem()` calcula o novo total e chama `updateItem.mutateAsync`
6. Funcao `handleCancelEditItem()` limpa o estado de edicao
7. O botao de excluir continua no mesmo lugar; os botoes de salvar/cancelar substituem ele durante a edicao

**Nenhuma alteracao em**:
- Banco de dados
- Hook `useServiceCallItems` (ja possui `updateItem`)
- Rotas
- Layout geral
- Nenhum outro componente

