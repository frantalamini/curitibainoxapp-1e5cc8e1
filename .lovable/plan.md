

# Implementação: Lista de OS Simplificada e Readonly

## Arquivo a Modificar
`src/pages/ServiceCalls.tsx`

## Mudanças a Aplicar

### 1. Imports
- Adicionar: `import { format } from "date-fns";` e `import { parseLocalDate } from "@/lib/dateUtils";`
- Remover: `Link` do react-router-dom (não será mais usado)
- Remover: imports de Select (não usados na lista readonly)

### 2. Variáveis do Hook
- Remover `updateServiceCall` do destructuring
- Remover variável `commercialStatuses`

### 3. Ordenação por os_number DESC (numérico)
```typescript
const sortedCalls = [...(filteredCalls || [])].sort((a, b) => {
  const nA = Number(a.os_number) || 0;
  const nB = Number(b.os_number) || 0;
  if (nA !== nB) return nB - nA;
  const cA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const cB = b.created_at ? new Date(b.created_at).getTime() : 0;
  return cB - cA;
});
```

### 4. Funções Auxiliares
```typescript
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "-";
  try {
    return format(parseLocalDate(dateStr), "dd/MM/yyyy");
  } catch {
    return "-";
  }
};

const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    navigate(`/service-calls/${id}`);
  }
};
```

### 5. Estrutura da Tabela (6 colunas)

| Coluna | Largura |
|--------|---------|
| Nº OS | w-[90px] |
| Cliente | min-w-0 (fluido) |
| Data | w-[110px] |
| Técnico | w-[140px] |
| St. Técnico | w-[160px] |
| St. Comercial | w-[160px] |

### 6. Elementos Removidos
- Coluna "Ações" com botão "Abrir"
- Todos os Select inline para status
- Todos os onClick stopPropagation

### 7. Navegação
- Linha clicável navega para `/service-calls/:id`
- Mobile card navega para `/service-calls/:id`
- Acessibilidade: role="button", tabIndex={0}, onKeyDown

