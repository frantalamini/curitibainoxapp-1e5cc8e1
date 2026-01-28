
# Correção: Larguras Proporcionais para Colunas da Tabela

## Causa Raiz Identificada
A tabela usa `table-fixed` mas a coluna "Cliente" não tem largura definida, fazendo ela consumir espaço excessivo e empurrar as colunas de status para fora do viewport.

## Solução
Definir larguras proporcionais para TODAS as colunas, garantindo que:
1. Todas as 6 colunas caibam em 100% zoom
2. A coluna Cliente tenha limite máximo
3. O nome do cliente seja truncado se muito longo

## Mudanças Específicas em `src/pages/ServiceCalls.tsx`

### Cabeçalho da Tabela (linhas 166-171)
```text
Antes:
<th className="w-[90px]...">Nº OS</th>
<th className="...">Cliente</th>           ← SEM LARGURA
<th className="w-[110px]...">Data</th>
<th className="w-[140px]...">Técnico</th>
<th className="w-[160px]...">St. Técnico</th>
<th className="w-[160px]...">St. Comercial</th>

Depois (larguras reduzidas e proporcionais):
<th className="w-[70px]...">Nº OS</th>
<th className="w-[30%] max-w-[250px]...">Cliente</th>  ← COM LIMITE
<th className="w-[90px]...">Data</th>
<th className="w-[100px]...">Técnico</th>
<th className="w-[130px]...">St. Técnico</th>
<th className="w-[130px]...">St. Comercial</th>
```

### Célula do Cliente (linha 189-192)
Adicionar truncamento para nomes longos:
```jsx
<td className="px-2 py-2 min-w-0 align-top leading-tight">
  <div className="font-medium text-sm truncate">{call.clients?.full_name}</div>
  <div className="text-xs text-muted-foreground truncate">{call.clients?.phone}</div>
</td>
```

## Impacto
- ✅ Todas as 6 colunas visíveis em 100% zoom
- ✅ Sidebar permanece visível
- ✅ Nomes longos são truncados com reticências
- ✅ Scroll horizontal só se absolutamente necessário
- ✅ Nenhuma mudança no mobile (cards)
- ✅ Nenhuma mudança na estrutura/ordem das colunas

## Arquivo Modificado
Apenas `src/pages/ServiceCalls.tsx` (linhas 166-171 e 189-192)
