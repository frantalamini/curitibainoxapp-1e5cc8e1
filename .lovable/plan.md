

# Ajuste Final de Larguras para Monitores Menores

## Problema Identificado
O uso de `w-[30%]` para a coluna Cliente em conjunto com `table-fixed` causa comportamento imprevisível. O 30% é calculado sobre a largura total da tabela, criando conflito com as colunas de largura fixa.

## Solução
Usar **apenas larguras fixas menores** para todas as colunas, permitindo que a coluna Cliente use o espaço restante de forma natural.

## Mudanças em `src/pages/ServiceCalls.tsx`

### Cabeçalho da Tabela (linhas 166-171)

| Coluna | Antes | Depois |
|--------|-------|--------|
| Nº OS | `w-[70px]` | `w-[60px]` |
| Cliente | `w-[30%] max-w-[250px]` | Sem largura fixa (usa espaço restante) |
| Data | `w-[90px]` | `w-[80px]` |
| Técnico | `w-[100px]` | `w-[90px]` |
| St. Técnico | `w-[130px]` | `w-[110px]` |
| St. Comercial | `w-[130px]` | `w-[110px]` |

**Total fixo:** 450px (antes era ~520px + 30%)

### Código Atualizado

```jsx
<th className="w-[60px] ...">Nº OS</th>
<th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs">Cliente</th>
<th className="w-[80px] ...">Data</th>
<th className="w-[90px] ...">Técnico</th>
<th className="w-[110px] ...">St. Técnico</th>
<th className="w-[110px] ...">St. Comercial</th>
```

### Reduzir truncamento dos status (linhas 206 e 217)

```jsx
<span className="text-xs truncate max-w-[100px] block">
```
(de 120px para 100px)

## Impacto
- ✅ Colunas fixas menores = mais espaço para Cliente
- ✅ Cliente expande naturalmente para preencher o restante
- ✅ Funciona em monitores de 1280px até 1920px
- ✅ Scroll horizontal aparece somente se extremamente necessário
- ✅ Nenhuma mudança no mobile (cards)
- ✅ Nenhuma mudança na estrutura/ordem das colunas

## Arquivo Modificado
Apenas `src/pages/ServiceCalls.tsx` (linhas 166-171, 206, 217)

