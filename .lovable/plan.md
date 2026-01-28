
# Ajuste de Responsividade da Tabela Desktop

## Diagnóstico Atual
O arquivo `src/pages/ServiceCalls.tsx` já possui:
- ✅ Container pai com `min-w-0` (linha 90)
- ✅ Wrapper da tabela com `w-full max-w-full overflow-x-auto` (linha 162)
- ✅ Tabela com `table-fixed` (linha 163)
- ⚠️ Falta `min-w-0` no wrapper da tabela
- ⚠️ Falta `overflow-y-visible` no wrapper
- ⚠️ Células de status podem ter texto longo sem truncamento

## Mudanças Específicas (somente tabela desktop)

### 1. Wrapper da Tabela (linha 162)
**Antes:**
```jsx
<div className="w-full max-w-full overflow-x-auto border rounded-lg">
```

**Depois:**
```jsx
<div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-visible border rounded-lg">
```

### 2. Células de Status com Truncamento (linhas 206 e 217)
**Antes:**
```jsx
<span className="text-xs whitespace-normal">{call.service_call_statuses.name}</span>
```

**Depois:**
```jsx
<span className="text-xs truncate max-w-[120px] block">{call.service_call_statuses.name}</span>
```

### 3. Célula do Cliente com overflow-wrap (linha 189)
**Antes:**
```jsx
<td className="px-2 py-2 min-w-0 whitespace-normal break-words align-top leading-tight">
```

**Depois:**
```jsx
<td className="px-2 py-2 min-w-0 align-top leading-tight" style={{ overflowWrap: 'anywhere' }}>
```

## Checklist de Validação
- [x] Container pai já tem `min-w-0`
- [ ] Wrapper da tabela terá `min-w-0`
- [ ] Wrapper terá `overflow-y-visible` para dropdowns
- [ ] Células de status terão truncamento
- [ ] Coluna cliente terá `overflow-wrap: anywhere`

## Impacto
- Nenhuma alteração no layout geral
- Nenhuma alteração no mobile (cards)
- Nenhuma alteração na ordem/estrutura das colunas
- Apenas comportamento de overflow e truncamento

## Arquivo Modificado
Apenas `src/pages/ServiceCalls.tsx`
