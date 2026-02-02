
# Plano: Correção de Erros - Página Pendencias e Sistema de Notificações

## Problema 1: Página /pendencias Quebrando

### Causa Raiz
A página `Pendencias.tsx` está tentando acessar `technicians.map()` na linha 275, mas `technicians` pode ser `undefined` enquanto os dados ainda estão carregando do hook `useTechnicians`.

```typescript
// Linha 83 - technicians pode ser undefined
const { technicians } = useTechnicians();

// Linha 275 - Erro quando technicians é undefined
{technicians.map((tech) => (
  <SelectItem key={tech.id} value={tech.id}>
    {tech.full_name}
  </SelectItem>
))}
```

### Solução
Adicionar proteção de array vazio usando optional chaining ou default value:

```typescript
{(technicians || []).map((tech) => (
  <SelectItem key={tech.id} value={tech.id}>
    {tech.full_name}
  </SelectItem>
))}
```

### Arquivo Afetado
- `src/pages/Pendencias.tsx` (linha 275)

---

## Problema 2: Notificação de Menção Não Aparecendo

### Análise
O sistema de notificações está **parcialmente funcionando**:
1. O trigger no banco de dados está criando notificações corretamente (há registro em `in_app_notifications`)
2. A tabela está com Realtime ativado
3. O hook `useMentionNotifications` parece estar correto

### Possíveis Causas
1. **Usuário testando consigo mesmo**: Se você está mencionando a si mesmo, a notificação vai para seu próprio ID, mas pode não aparecer toast porque o evento Realtime é disparado antes do canal estar inscrito

2. **Link de navegação incorreto**: O trigger gera o link como `/service-calls/{id}` mas a rota correta pode ser `/service-calls/view/{id}`

3. **Filtro de tipo no Realtime**: O Realtime não está filtrando por `type = 'mention'`, então está recebendo todas as notificações

### Soluções

#### Correção 1: Link de Navegação
Atualizar o trigger para gerar o link correto:

```sql
-- Link incorreto atual
'/service-calls/' || v_service_call_id

-- Link correto
'/service-calls/view/' || v_service_call_id
```

#### Correção 2: Log para Debug
Adicionar console.log temporário no hook para verificar se o canal está recebendo eventos.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Pendencias.tsx` | Adicionar fallback `(technicians \|\| [])` para evitar erro |
| Migração SQL | Corrigir link no trigger `create_mention_notification` |

---

## Detalhes Técnicos

### 1. Correção Pendencias.tsx (linha 275)

```typescript
// ANTES
{technicians.map((tech) => (

// DEPOIS  
{(technicians || []).map((tech) => (
```

### 2. Migração SQL - Correção do Trigger

```sql
-- Atualizar função para gerar link correto
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_os_number integer;
  v_author_name text;
  v_service_call_id uuid;
BEGIN
  SELECT 
    sc.os_number,
    sc.id,
    COALESCE(p.full_name, 'Alguém')
  INTO v_os_number, v_service_call_id, v_author_name
  FROM service_call_messages msg
  JOIN service_calls sc ON sc.id = msg.service_call_id
  LEFT JOIN profiles p ON p.user_id = msg.author_id
  WHERE msg.id = NEW.message_id;

  INSERT INTO public.in_app_notifications (
    user_id,
    type,
    title,
    body,
    link,
    metadata
  ) VALUES (
    NEW.mentioned_user_id,
    'mention',
    'Você foi mencionado em uma OS',
    v_author_name || ' mencionou você na OS #' || v_os_number,
    '/service-calls/view/' || v_service_call_id,  -- CORRIGIDO: adicionado /view/
    jsonb_build_object(
      'service_call_id', v_service_call_id,
      'os_number', v_os_number,
      'message_id', NEW.message_id,
      'author_name', v_author_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Sobre a Página Pendencias

Sim, a página `/pendencias` é o dashboard centralizado de **pendências do chat interno da OS**. Ela mostra:
- Mensagens com `requires_action = true` que ainda não foram resolvidas
- Agrupadas por status de SLA (Atrasadas, Vence Hoje, No Prazo)
- Filtros por categoria, prioridade, técnico

O erro atual está impedindo a página de carregar porque o array de técnicos não está disponível imediatamente.

---

## Resumo das Correções

1. **Pendencias.tsx**: Adicionar proteção `|| []` no mapeamento de técnicos
2. **Migração SQL**: Corrigir o link do trigger de `/service-calls/` para `/service-calls/view/`
