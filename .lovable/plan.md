

# Plano: Ajustar Chat Input Mobile + Notificações de Menções

## Problema 1: Layout do Chat Input no Mobile

### Situação Atual
O campo de digitação está na mesma linha que 4 botões (anexo, @, templates, enviar), resultando em pouco espaço para digitar no mobile.

### Solução
Reorganizar o layout para mobile:
- **Linha 1**: Botões de ação (Anexo, @, Templates)
- **Linha 2**: Campo de texto + botão enviar

```text
ANTES (layout atual):
+----------------------------------------------+
| [📎] [@] [textarea.........] [📝] [➤]        |
+----------------------------------------------+

DEPOIS (layout proposto):
+----------------------------------------------+
| [📎 Anexo]  [@Mencionar]  [📝 Template]      |
+----------------------------------------------+
| [textarea..............................] [➤] |
+----------------------------------------------+
```

### Arquivo Afetado
`src/components/service-calls/ChatInput.tsx`

---

## Problema 2: Notificação de Menção In-App

### Situação Atual
- Quando alguém é mencionado (@Jonatas), o registro é salvo na tabela `service_call_message_mentions`
- Mas não há notificação visual na tela do usuário mencionado
- Existe um sistema de notificações para técnicos (novas OSs), mas não para menções

### Solução Proposta

Criar um sistema de notificações in-app para menções com as seguintes partes:

#### 1. Tabela de Notificações (Nova)
Criar tabela `in_app_notifications` para armazenar notificações genéricas:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | ID da notificação |
| user_id | uuid | Usuário destinatário |
| type | text | Tipo (mention, assignment, etc) |
| title | text | Título da notificação |
| body | text | Corpo da mensagem |
| link | text | Link para navegar |
| read_at | timestamp | Data de leitura |
| created_at | timestamp | Data de criação |

#### 2. Trigger Automático
Quando uma menção é criada em `service_call_message_mentions`, um trigger cria automaticamente uma notificação para o usuário mencionado.

#### 3. Hook de Notificações de Menções
Novo hook `useMentionNotifications` que:
- Busca notificações não lidas do usuário logado
- Usa Realtime para atualização instantânea
- Expõe contador e lista de notificações

#### 4. Componente de Badge Global
Modificar o `NotificationBell` existente para incluir também notificações de menções, ou criar um badge separado para menções.

#### 5. Toast/Popup Instantâneo
Quando uma nova menção chegar via Realtime, exibir um toast temporário na tela do usuário mencionado.

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/service-calls/ChatInput.tsx` | Reorganizar layout mobile |
| `src/hooks/useMentionNotifications.ts` | Novo - Hook para buscar menções não lidas |
| `src/components/mobile/NotificationBell.tsx` | Modificar - Incluir notificações de menções |
| Migração SQL | Nova tabela + trigger |

---

## Arquitetura de Notificações Realtime

```text
+-------------------------+
|  Usuário envia menção   |
+-------------------------+
            |
            v
+-------------------------+
|  INSERT em mentions     |
+-------------------------+
            |
            v
+-------------------------+
|  Trigger cria notif     |
|  em in_app_notifications|
+-------------------------+
            |
            v (Realtime)
+-------------------------+
|  Usuário mencionado     |
|  recebe atualização     |
+-------------------------+
            |
            v
+-------------------------+
|  Toast + Badge atualiza |
+-------------------------+
```

---

## Detalhes Técnicos

### Migração SQL (Resumo)

```sql
-- Tabela de notificações in-app
CREATE TABLE public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: usuário só vê suas notificações
CREATE POLICY "Users can view own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger para criar notificação ao mencionar
CREATE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria notificação para usuário mencionado
  INSERT INTO in_app_notifications (user_id, type, title, body, link, metadata)
  SELECT 
    NEW.mentioned_user_id,
    'mention',
    'Você foi mencionado em uma OS',
    -- Buscar OS number e autor
    ...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Hook useMentionNotifications

```typescript
export const useMentionNotifications = () => {
  // Busca notificações type='mention' não lidas
  // Subscreve ao Realtime para atualizações
  // Retorna: unreadCount, notifications, markAsRead
};
```

### Toast Instantâneo

Quando uma nova notificação chegar via Realtime, dispara um toast:

```typescript
toast({
  title: "Nova menção",
  description: "@Fulano mencionou você na OS #123",
  action: <Button onClick={() => navigate(link)}>Ver</Button>
});
```

---

## Resumo das Mudanças

1. **ChatInput.tsx**: Reorganizar botões em linha separada para mobile
2. **Nova migração**: Tabela `in_app_notifications` + trigger
3. **Novo hook**: `useMentionNotifications.ts`
4. **NotificationBell**: Incluir badge de menções
5. **Toast realtime**: Popup instantâneo ao receber menção

