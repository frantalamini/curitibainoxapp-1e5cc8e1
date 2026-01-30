
# Plano: Correção do Layout da Tela de Edição de OS

## Problema Identificado

A página de edição de Ordens de Serviço (`ServiceCallForm.tsx`) ainda usa o layout centralizado antigo:
```tsx
<div className="container mx-auto px-4 py-6 space-y-6">
```

Isso causa o conteúdo ficar centralizado com margens excessivas, diferente da listagem de chamados que foi otimizada.

## Solução

Aplicar o mesmo padrão de layout utilizado na listagem de chamados técnicos:

```tsx
<div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
```

## Arquivo a Modificar

| Arquivo | Linha | De | Para |
|---------|-------|-----|------|
| `ServiceCallForm.tsx` | 942 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |

---

## Seção Técnica

### Mudança no ServiceCallForm.tsx

```tsx
// ANTES (linha 942)
<div className="container mx-auto px-4 py-6 space-y-6">

// DEPOIS
<div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
```

### Resultado

- Conteúdo da edição de OS alinhado à esquerda
- Consistente com a listagem de chamados
- Melhor aproveitamento do espaço em monitores grandes
- Visualização de todas as abas (Geral, Técnicas, Financeiro) sem zoom
