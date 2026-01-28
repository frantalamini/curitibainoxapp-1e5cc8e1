

# Ajuste Único: min-width:0 no Container Pai da Tabela

## Diagnóstico
Analisei a estrutura atual e identifiquei:

1. **O wrapper da tabela** (linha 162 em `ServiceCalls.tsx`) já possui as propriedades corretas:
   ```html
   <div className="w-full max-w-full overflow-x-auto border rounded-lg">
   ```

2. **O container pai imediato** (linha 90) é um `<div className="space-y-4 md:space-y-6">` que **não possui** `min-w-0`.

3. **O MainLayout** tem `main` com `flex-1 min-w-0`, mas o `<div className="p-4 sm:p-6 lg:p-8">` intermediário não possui.

## Solução
Adicionar `min-w-0` ao container pai imediato da tabela para garantir que containers flex/grid não forcem a tabela a expandir além do viewport.

## Arquivo a Modificar
`src/pages/ServiceCalls.tsx`

## Mudança Única

**Linha 90 - Antes:**
```jsx
<div className="space-y-4 md:space-y-6">
```

**Depois:**
```jsx
<div className="space-y-4 md:space-y-6 min-w-0">
```

## Impacto
- Nenhuma alteração visual
- Nenhuma mudança em layout, cores, tipografia ou espaçamentos
- Apenas garante que o container não force overflow em contextos flex/grid
- Mantém 100% do app como está

