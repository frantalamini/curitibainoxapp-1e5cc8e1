
## Plano: Técnicos Visualizam Todos os Chamados

### Situação Atual
Hoje as políticas RLS restringem técnicos a visualizar apenas chamados onde eles são o técnico atribuído:
- **service_calls**: "Technicians see only assigned calls, admins see all"
- **clients**: "Technicians see only active assignment clients" 
- **service_call_markers**: Restringe por chamado atribuído
- **service_call_messages**: Usa função `is_technician_of_service_call` que verifica atribuição

### O Que Será Alterado

| Tabela | Mudança |
|--------|---------|
| `service_calls` | Técnicos veem **todos** os chamados |
| `clients` | Técnicos veem **todos** os clientes que têm chamados ativos |
| `service_call_markers` | Técnicos veem marcadores de **todos** os chamados |
| `service_call_messages` | Técnicos veem mensagens de **todos** os chamados |

### O Que **Não** Será Alterado
- **Notificações**: Continuam filtradas por técnico atribuído (`useNotifications.ts` e `useNewServiceCallsCount.ts` já filtram por `technician_id`)
- **Contador de "Novos"**: Continua mostrando apenas chamados novos do técnico logado
- **Aba "Novos" em Chamados**: Continua filtrando por técnico logado

---

## Detalhes Técnicos

### 1. Alterar Política de SELECT em `service_calls`

**Antes:**
```sql
(has_role('admin') OR (has_role('technician') AND técnico == usuário))
```

**Depois:**
```sql
(has_role('admin') OR has_role('technician'))
```

### 2. Alterar Política de SELECT em `clients`

**Antes:**
```sql
-- Técnicos veem apenas clientes de chamados atribuídos a eles
```

**Depois:**
```sql
-- Técnicos veem todos os clientes que possuem chamados ativos (não completados/cancelados)
```

### 3. Alterar Política de SELECT em `service_call_markers`

**Antes:**
```sql
-- Verifica se técnico é atribuído ao chamado
```

**Depois:**
```sql
-- Técnicos veem marcadores de todos os chamados
```

### 4. Alterar Política de SELECT em `service_call_messages`

**Antes:**
```sql
-- Técnicos veem apenas mensagens de chamados atribuídos
```

**Depois:**
```sql
-- Técnicos veem mensagens de todos os chamados
```

---

## Resumo do Comportamento Final

| Funcionalidade | Comportamento |
|----------------|---------------|
| Lista de chamados | Técnicos veem **todos** os chamados |
| Detalhes do chamado | Técnicos podem abrir **qualquer** chamado |
| Chat do chamado | Técnicos veem mensagens de **qualquer** chamado |
| Notificações | Apenas para chamados **atribuídos ao técnico** |
| Contador "Novos" | Apenas chamados novos **atribuídos ao técnico** |

---

## Arquivos Impactados

**Banco de dados (migrations):**
- 1 nova migration SQL para alterar as 4 políticas RLS

**Frontend:**
- Nenhuma alteração necessária (a lógica de notificações já filtra corretamente por `technician_id`)
