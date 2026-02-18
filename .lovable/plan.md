

## Exibir Equipamento na tabela de Chamados Tecnicos

### O que sera feito

Adicionar uma coluna "Equipamento" na tabela de listagem de OS (ServiceCallsTable), entre a coluna "Cliente" e "Data", exibindo o campo `equipment_description` que ja esta disponivel nos dados carregados.

### Como encaixar sem alterar estrutura

- A coluna "Cliente" atualmente ocupa espaco livre (sem width definido). Vou dividir esse espaco: Cliente continua sem width fixo mas com `max-w` reduzido, e Equipamento entra com `w-[12%]` (mesma proporcao das colunas de status).
- O texto do equipamento sera truncado com `truncate` para nao estourar o layout.
- Nenhuma outra coluna tera seu tamanho ou margem alterado.

### Detalhes Tecnicos

**Arquivo**: `src/components/ServiceCallsTable.tsx`

1. Adicionar `<TableHead>` "Equip." entre "Cliente" e "Data" com `w-[10%]`
2. Adicionar `<TableCell>` correspondente exibindo `call.equipment_description` com `truncate`, `text-xs` e `max-w-[100px]`
3. Reduzir o `max-w` da coluna Cliente de `240px` para `200px` para acomodar

Nenhuma alteracao em banco, hooks, rotas ou outros componentes.

