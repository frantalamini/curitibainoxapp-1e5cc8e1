

## Adicionar coluna "Total" na listagem de Ordens de Servico

### Objetivo
Exibir o valor total financeiro de cada OS na tabela de listagem, visivel apenas para perfis **Gerencial** e **Adm**. Tecnicos continuam sem acesso a informacoes financeiras.

### Abordagem

A coluna "Total" sera calculada a partir da tabela `service_call_items`, somando o campo `total` de todos os itens de cada OS. Para evitar N+1 queries, faremos uma unica consulta agregada para todas as OS visiveis na pagina.

### Alteracoes

**1. `src/pages/ServiceCalls.tsx`**
- Importar `useUserRole` para obter `isAdmin`
- Criar um hook/query local que busca os totais agregados por `service_call_id` para as OS da pagina atual (apenas quando `isAdmin` for true)
- Passar `isAdmin` e o mapa de totais para `ServiceCallsTable` e `ServiceCallMobileCard`

**2. `src/components/ServiceCallsTable.tsx`**
- Receber props `showTotal?: boolean` e `totalsByServiceCallId?: Record<string, number>`
- Quando `showTotal` for true, renderizar a coluna "Total" entre "Status Comercial" e "Marcadores"
- Formatar valor em R$ (BRL)

**3. `src/components/mobile/ServiceCallMobileCard.tsx`**
- Receber props `showTotal?: boolean` e `totalValue?: number`
- Quando `showTotal` for true, exibir uma linha adicional com o valor total formatado

### Query de totais (dentro de ServiceCalls.tsx)
```sql
SELECT service_call_id, SUM(total) as total
FROM service_call_items
WHERE service_call_id IN (...)
GROUP BY service_call_id
```
Sera implementada via Supabase JS com `.rpc()` ou query direta com agrupamento client-side (ja que o Supabase JS nao suporta GROUP BY nativamente, faremos select dos items e agrupamento no frontend).

### Seguranca
- A tabela `service_call_items` ja possui RLS restrita a admins (policy "Admins can manage service call items")
- Tecnicos nao conseguem consultar essa tabela, entao mesmo que o codigo tente buscar, a query retornara vazio
- A flag `showTotal` sera `false` para tecnicos, ocultando a coluna na UI

### Impacto
- Nenhuma alteracao em funcionalidades existentes
- Nenhuma migration necessaria
- Apenas 3 arquivos editados

