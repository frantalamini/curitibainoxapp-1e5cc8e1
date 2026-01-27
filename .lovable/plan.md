

## Plano: Correções na Lista de OS com Coluna Ações Sticky

### Suas 3 Condições Obrigatórias ✅

1. **Coluna Ações com sticky** → Aplicar `sticky right-0 bg-white z-10` diretamente no `th/td`
2. **Wrapper correto** → Garantir `w-full max-w-full overflow-x-auto min-w-0` no container
3. **Validar no domínio publicado** → Testar em `curitibainoxapp.com` após publicar

---

### Alterações em `src/pages/ServiceCalls.tsx`

**1. Adicionar import do Link:**
```tsx
import { useNavigate, useSearchParams, Link } from "react-router-dom";
```

**2. Ajustar wrapper da tabela (linha 138):**
```tsx
// ANTES
<div className="w-full overflow-x-auto border rounded-lg">

// DEPOIS
<div className="w-full max-w-full overflow-x-auto min-w-0 border rounded-lg">
```

**3. Adicionar coluna Ações no colgroup (nova coluna com 80px):**
```tsx
<colgroup>
  <col style={{ width: '70px' }} />
  <col style={{ width: '90px' }} />
  <col style={{ width: '180px' }} />   {/* Cliente - reduzido */}
  <col style={{ width: '150px' }} />   {/* Equipamento - reduzido */}
  <col style={{ width: '100px' }} />   {/* Tipo - reduzido */}
  <col style={{ width: '90px' }} />
  <col style={{ width: '130px' }} />   {/* St. Técnico - reduzido */}
  <col style={{ width: '130px' }} />   {/* St. Comercial - reduzido */}
  <col style={{ width: '80px' }} />    {/* NOVA: Ações */}
</colgroup>
```

**4. Adicionar header da coluna Ações com sticky:**
```tsx
<th 
  className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs"
  style={{ 
    position: 'sticky', 
    right: 0, 
    backgroundColor: 'white', 
    zIndex: 10 
  }}
>
  Ações
</th>
```

**5. Trocar button por Link no Nº OS (linha 174-182):**
```tsx
// ANTES
<button onClick={(e) => {...}} className="...">
  {call.os_number}
</button>

// DEPOIS
<Link
  to={`/service-calls/${call.id}`}
  onClick={(e) => e.stopPropagation()}
  className="font-mono text-sm font-semibold text-primary hover:underline cursor-pointer"
>
  {call.os_number}
</Link>
```

**6. Adicionar célula de Ações com sticky em cada row:**
```tsx
<td 
  className="px-2 py-2 align-top"
  style={{ 
    position: 'sticky', 
    right: 0, 
    backgroundColor: 'white', 
    zIndex: 10 
  }}
  onClick={(e) => e.stopPropagation()}
>
  <Link
    to={`/service-calls/${call.id}`}
    className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
  >
    Abrir
  </Link>
</td>
```

---

### Arquivos NÃO Alterados (conforme solicitado)

| Arquivo | Status |
|---------|--------|
| `ServiceCallView.tsx` | ❌ Não mexer |
| `ServiceCallForm.tsx` | ❌ Não mexer |
| `FinanceiroTab.tsx` | ❌ Não mexer |
| `FinanceiroGuard.tsx` | ❌ Não mexer |
| CSS global (`index.css`) | ❌ Não mexer |

---

### Larguras Finais das Colunas

| Coluna | Largura |
|--------|---------|
| Nº OS | 70px |
| Data/Hora | 90px |
| Cliente | 180px |
| Equipamento | 150px |
| Tipo | 100px |
| Técnico | 90px |
| St. Técnico | 130px |
| St. Comercial | 130px |
| **Ações (sticky)** | **80px** |
| **TOTAL** | **1020px** |

---

### Critérios de Aceite

1. ✅ Coluna "Ações" sempre visível (sticky à direita com fundo branco)
2. ✅ Scroll horizontal funciona sem cortar colunas
3. ✅ Clicar no Nº OS navega para `/service-calls/:id`
4. ✅ Botão "Abrir" na coluna Ações também navega
5. ✅ Funciona igual no Preview e no Published (curitibainoxapp.com)

---

### Após Publicar

Você precisará:
1. Clicar em **"Publicar"** no Lovable
2. Aguardar deploy concluir
3. Testar em `curitibainoxapp.lovable.app` E `curitibainoxapp.com`

