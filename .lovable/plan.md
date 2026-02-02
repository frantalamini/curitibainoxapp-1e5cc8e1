
## Plano: Ajustar Largura das Abas para Exibir Chat

### Problema Identificado
A aba "Chat" não aparece para técnicos porque:
1. A aba "Informações Técnicas" tem texto muito longo sem tratamento responsivo
2. O grid de 4 colunas força todas as abas em espaço igual, mas o texto longo estoura
3. No mobile, a aba "Chat" fica cortada ou invisível

### Solução
Aplicar o mesmo padrão responsivo já usado em "Financeiro" e "Chat" para a aba "Informações Técnicas":
- No mobile: mostrar apenas ícone + texto curto
- No desktop: mostrar texto completo

### Mudanças

**Arquivo:** `src/pages/ServiceCallForm.tsx`

**Linha 1077-1078** - Aba "Informações Técnicas":

Antes:
```tsx
<TabsTrigger value="tecnicas">Informações Técnicas</TabsTrigger>
```

Depois:
```tsx
<TabsTrigger 
  value="tecnicas" 
  className="flex items-center justify-center gap-1.5"
>
  <Stethoscope className="w-4 h-4" />
  <span className="hidden sm:inline">Informações Técnicas</span>
  <span className="sm:hidden">Técnico</span>
</TabsTrigger>
```

**Linha 1077** - Aba "Geral" (também otimizar):

Antes:
```tsx
<TabsTrigger value="geral">Geral</TabsTrigger>
```

Depois:
```tsx
<TabsTrigger value="geral" className="flex items-center justify-center gap-1.5">
  <FileText className="w-4 h-4 sm:hidden" />
  <span>Geral</span>
</TabsTrigger>
```

### Resultado Visual no Mobile

| Antes | Depois |
|-------|--------|
| Geral | Geral |
| Informações Técnicas (cortado) | 🩺 Técnico |
| $ | 💲 $ |
| (invisível) | 💬 Chat |

### Arquivos Impactados
- `src/pages/ServiceCallForm.tsx` (linhas 1077-1078)

### Observação
O ícone `Stethoscope` já está importado no arquivo (linha 24). Nenhuma nova dependência necessária.
