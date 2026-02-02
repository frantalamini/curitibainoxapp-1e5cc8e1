
## Plano: Exibir Nome Secundário no Card Mobile de Chamados

### Objetivo
Adicionar o campo **Nome Secundário** (secondary_name) no card mobile dos chamados técnicos, exibido em azul logo abaixo do nome do cliente.

---

### Alteração Necessária

**Arquivo:** `src/components/mobile/ServiceCallMobileCard.tsx`

**Mudança no bloco de Cliente (linhas 65-76):**

Adicionar o `secondary_name` logo após o nome do cliente, estilizado em azul (`text-blue-600`) conforme o padrão já estabelecido no sistema.

**De:**
```tsx
<MobileCardRow
  icon={<User className="h-4 w-4" />}
  label="Cliente"
  value={
    <div className="flex flex-col">
      <span className="font-medium">{call.clients?.full_name}</span>
      {call.clients?.phone && (
        <span className="text-xs text-muted-foreground">{call.clients.phone}</span>
      )}
    </div>
  }
/>
```

**Para:**
```tsx
<MobileCardRow
  icon={<User className="h-4 w-4" />}
  label="Cliente"
  value={
    <div className="flex flex-col">
      <span className="font-medium">{call.clients?.full_name}</span>
      {call.clients?.secondary_name && (
        <span className="text-xs text-blue-600 font-medium">{call.clients.secondary_name}</span>
      )}
      {call.clients?.phone && (
        <span className="text-xs text-muted-foreground">{call.clients.phone}</span>
      )}
    </div>
  }
/>
```

---

### Resultado Visual

```
📅 Data/Hora
   02/02/2026 às 10:30:00

👤 Cliente
   R&R SANTOS CONFEITARIA LTDA
   DOCE CHIC                    ← (azul)
   (41) 3667-9335

⏰ Técnico
   Anderson
```

---

### Arquivo Impactado

| Arquivo | Mudança |
|---------|---------|
| `src/components/mobile/ServiceCallMobileCard.tsx` | Adicionar exibição do secondary_name em azul |
