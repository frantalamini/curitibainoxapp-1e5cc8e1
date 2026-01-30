
# Plano Completo: Sistema de Chat Interno por OS com Todas as Funcionalidades

## Visão Geral do Sistema

Implementação de um sistema de comunicação interna completo vinculado a cada Ordem de Serviço, com:
- Chat com menções (@usuário)
- Anexos de fotos/arquivos
- Categorização de pendências (tipo + prioridade)
- SLA/Prazos com alertas visuais
- Templates de mensagens rápidas
- Notificações WhatsApp opcionais
- Dashboard centralizado de pendências
- Histórico completo de resoluções

---

## Parte 1: Estrutura de Banco de Dados

### Novas Tabelas

```text
┌─────────────────────────────────────────────────────────────────┐
│                     service_call_messages                        │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ service_call_id (uuid, FK → service_calls)                      │
│ author_id (uuid, FK → profiles.user_id)                         │
│ content (text) - texto da mensagem                              │
│ category (text) - 'part_request' | 'quote' | 'approval' | null  │
│ priority (text) - 'low' | 'normal' | 'high' | 'urgent'          │
│ requires_action (boolean) - se é uma pendência                  │
│ due_date (timestamptz) - prazo SLA (opcional)                   │
│ resolved_at (timestamptz) - quando foi resolvida                │
│ resolved_by (uuid) - quem resolveu                              │
│ resolution_notes (text) - observação de encerramento            │
│ created_at (timestamptz)                                        │
│ updated_at (timestamptz)                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 service_call_message_mentions                    │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ message_id (uuid, FK → service_call_messages)                   │
│ mentioned_user_id (uuid)                                        │
│ notified_via_whatsapp (boolean) - se enviou WhatsApp            │
│ seen_at (timestamptz) - quando o usuário viu                    │
│ created_at (timestamptz)                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 service_call_message_attachments                 │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ message_id (uuid, FK → service_call_messages)                   │
│ file_url (text) - URL no storage                                │
│ file_name (text) - nome original                                │
│ file_type (text) - 'image' | 'document' | 'audio'               │
│ file_size (integer) - tamanho em bytes                          │
│ created_at (timestamptz)                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      message_templates                           │
├─────────────────────────────────────────────────────────────────┤
│ id (uuid, PK)                                                   │
│ title (text) - ex: "Peça chegou"                                │
│ content (text) - texto pré-definido                             │
│ category (text) - categoria associada                           │
│ is_active (boolean)                                             │
│ display_order (integer)                                         │
│ created_at (timestamptz)                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Categorias de Pendência (Enum)

| Valor | Label PT-BR | Ícone |
|-------|-------------|-------|
| `part_request` | Peça Necessária | 🔧 |
| `quote_pending` | Orçamento Pendente | 💰 |
| `approval_needed` | Aprovação Gerencial | ✅ |
| `info_needed` | Informação Adicional | ℹ️ |
| `schedule_change` | Reagendamento | 📅 |
| `other` | Outros | 📝 |

### Prioridades e SLA

| Prioridade | Cor | SLA Padrão |
|------------|-----|------------|
| `low` | Cinza | 72h |
| `normal` | Azul | 24h |
| `high` | Laranja | 8h |
| `urgent` | Vermelho | 2h |

---

## Parte 2: Políticas de Acesso (RLS)

### Regras de Visibilidade

```text
┌──────────────┬─────────────────────────────────────────────────────┐
│   Perfil     │                    Acesso                          │
├──────────────┼─────────────────────────────────────────────────────┤
│ Gerencial    │ Ver TODAS as mensagens de TODAS as OS              │
│              │ Criar mensagens em qualquer OS                     │
│              │ Resolver qualquer pendência                        │
│              │ Deletar mensagens                                  │
├──────────────┼─────────────────────────────────────────────────────┤
│ Adm          │ Ver TODAS as mensagens de TODAS as OS              │
│              │ Criar mensagens em qualquer OS                     │
│              │ Resolver qualquer pendência                        │
│              │ NÃO pode deletar mensagens                         │
├──────────────┼─────────────────────────────────────────────────────┤
│ Técnico      │ Ver apenas mensagens onde:                         │
│              │   - É o autor OU                                   │
│              │   - Foi mencionado OU                              │
│              │   - É o técnico responsável da OS                  │
│              │ Criar mensagens apenas nas OS atribuídas           │
│              │ NÃO pode resolver pendências (apenas solicitar)    │
└──────────────┴─────────────────────────────────────────────────────┘
```

---

## Parte 3: Componentes de Interface

### 3.1 Chat na OS (ServiceCallChat.tsx)

Localização: Nova seção expandível na `ServiceCallView.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ 💬 Chat Interno                                    [3 pendentes] │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Timeline de Mensagens (ScrollArea)                        │   │
│ │                                                           │   │
│ │  [Avatar] Técnico João - 14:35                           │   │
│ │  @Jonatas preciso da peça X para o compressor             │   │
│ │  [📎 foto_peca.jpg]                                       │   │
│ │  🔧 PEÇA NECESSÁRIA | ⏰ Prazo: 16/02 18:00              │   │
│ │  [ ✅ Resolver ]                                          │   │
│ │                                                           │   │
│ │  [Avatar] Jonatas (Adm) - 15:20                          │   │
│ │  Peça comprada! Vai chegar amanhã.                        │   │
│ │  [📎 nota_fiscal.pdf]                                     │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [📎] [@] Digite sua mensagem...              [Templates ▼] │   │
│ │                                                           │   │
│ │ ☐ Marcar como pendência                                   │   │
│ │   Categoria: [Peça Necessária ▼]  Prioridade: [Normal ▼]  │   │
│ │   Prazo: [__/__/____ __:__]                               │   │
│ │                                                           │   │
│ │ ☐ Notificar mencionados via WhatsApp                      │   │
│ │                                                    [Enviar]│   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Funcionalidades do Input:**
- Autocomplete de menções ao digitar `@`
- Upload de arquivos com drag & drop
- Preview de imagens antes de enviar
- Dropdown de templates rápidos
- Checkbox para marcar como pendência
- Seletor de categoria e prioridade
- Date/time picker para prazo
- Toggle de notificação WhatsApp

### 3.2 Componente de Menção (UserMentionInput.tsx)

Dropdown acionado por `@`:
```text
┌─────────────────────────┐
│ 🔍 Buscar usuário...    │
├─────────────────────────┤
│ [👤] Jonatas (Adm)      │
│ [👤] Maria (Gerencial)  │
│ [👤] Carlos (Técnico)   │
│ [👤] Pedro (Técnico)    │
└─────────────────────────┘
```

### 3.3 Card de Mensagem (ChatMessage.tsx)

Elementos visuais:
- Avatar do autor
- Nome e cargo/perfil
- Timestamp relativo ("há 5 min")
- Conteúdo com menções destacadas em azul
- Anexos com thumbnails
- Badge de categoria (se pendência)
- Indicador de prazo (verde/amarelo/vermelho)
- Botão "Resolver" (só para ADM/Gerencial)

### 3.4 Modal de Resolução (ResolveMessageModal.tsx)

```text
┌─────────────────────────────────────────────┐
│ ✅ Resolver Pendência                       │
├─────────────────────────────────────────────┤
│ OS #1234 - Peça Necessária                  │
│                                             │
│ Observação de encerramento:                 │
│ ┌─────────────────────────────────────────┐ │
│ │ Peça entregue ao técnico em mãos.       │ │
│ │ NF: 12345                               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│            [Cancelar]  [Confirmar ✓]        │
└─────────────────────────────────────────────┘
```

---

## Parte 4: Dashboard de Pendências

### Nova Página: `/pendencias`

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Pendências Abertas                              [Filtros ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Filtros Ativos:                                             │ │
│ │ [Todas Categorias ▼] [Todas Prioridades ▼] [Todos Téc. ▼]  │ │
│ │ [🔴 Atrasadas] [🟡 Vence Hoje] [🟢 No Prazo]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔴 ATRASADAS (3)                                            │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ OS #1234 | João Silva | 🔧 Peça Necessária                  │ │
│ │ "Preciso da válvula do compressor"                          │ │
│ │ ⏰ Atrasado: 2 dias | 👤 @Jonatas                           │ │
│ │                                    [Abrir OS] [Resolver ✓]  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ OS #1235 | Maria Santos | 💰 Orçamento Pendente             │ │
│ │ "Cliente quer orçamento da manutenção preventiva"           │ │
│ │ ⏰ Atrasado: 1 dia | 👤 @Admin                              │ │
│ │                                    [Abrir OS] [Resolver ✓]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟡 VENCE HOJE (2)                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 NO PRAZO (5)                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Contador no Menu Lateral

Adicionar badge vermelho no item "Pendências" do MainLayout:
```text
📋 Pendências [3]  ← badge vermelho se há atrasadas
```

---

## Parte 5: Templates de Mensagens Rápidas

### Templates Pré-configurados

| Template | Conteúdo | Categoria |
|----------|----------|-----------|
| Peça solicitada | "Necessário comprar: [descrever peça]" | part_request |
| Peça chegou | "A peça solicitada chegou e foi enviada." | - |
| Orçamento solicitado | "Cliente solicitou orçamento para: [descrever]" | quote_pending |
| Orçamento enviado | "Orçamento enviado ao cliente. Valor: R$ [valor]" | - |
| Aguardando aprovação | "Aguardando aprovação gerencial para: [descrever]" | approval_needed |
| Serviço concluído | "Serviço finalizado com sucesso." | - |
| Reagendamento | "Serviço reagendado para: [data]" | schedule_change |

### Interface de Seleção

Dropdown no input de mensagem:
```text
[Templates ▼]
├── 🔧 Peça solicitada
├── ✅ Peça chegou  
├── 💰 Orçamento solicitado
├── 📧 Orçamento enviado
├── ⏳ Aguardando aprovação
├── 🎉 Serviço concluído
└── 📅 Reagendamento
```

---

## Parte 6: Notificações WhatsApp

### Fluxo de Notificação

```text
Usuário cria mensagem com @menção
         ↓
Marca checkbox "Notificar via WhatsApp"
         ↓
Sistema busca telefone do mencionado (profiles.phone)
         ↓
Abre WhatsApp com mensagem pré-formatada:
"🔔 Nova mensagem na OS #1234
De: João (Técnico)
Mensagem: @Jonatas preciso da peça X...
Acesse: [link da OS]"
```

### Integração com Templates Existentes

Reutilizar funções de `src/lib/whatsapp-templates.ts`:
- `normalizePhone()` - já existe
- `buildWhatsAppUrl()` - já existe
- `openWhatsApp()` - já existe

---

## Parte 7: Funcionalidades em Tempo Real

### Supabase Realtime

```text
Canal: service_call_messages-{service_call_id}
Eventos: INSERT, UPDATE, DELETE

Ações:
- INSERT → Adiciona mensagem na timeline
- UPDATE → Atualiza status (resolved)
- DELETE → Remove da lista (só gerencial)
```

### Integração com Notificações Existentes

Estender `useNotifications.ts` para incluir menções:
- Badge no sino para novas menções
- Lista de menções não lidas no dropdown

---

## Parte 8: Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/service-calls/ServiceCallChat.tsx` | Componente principal do chat |
| `src/components/service-calls/ChatMessage.tsx` | Card de mensagem individual |
| `src/components/service-calls/ChatInput.tsx` | Input com menções e anexos |
| `src/components/service-calls/UserMentionInput.tsx` | Autocomplete de @menções |
| `src/components/service-calls/ChatAttachments.tsx` | Preview de anexos |
| `src/components/service-calls/MessageTemplates.tsx` | Dropdown de templates |
| `src/components/service-calls/ResolveMessageModal.tsx` | Modal de resolução |
| `src/components/service-calls/PendingBadge.tsx` | Badge de categoria/prazo |
| `src/hooks/useServiceCallMessages.ts` | CRUD de mensagens |
| `src/hooks/useMessageTemplates.ts` | Hook para templates |
| `src/hooks/usePendingActions.ts` | Hook para dashboard |
| `src/pages/Pendencias.tsx` | Dashboard de pendências |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ServiceCallView.tsx` | Adicionar seção de Chat |
| `src/components/MainLayout.tsx` | Adicionar item "Pendências" no menu |
| `src/App.tsx` | Adicionar rota `/pendencias` |
| `src/hooks/useNotifications.ts` | Incluir menções no sistema de notificação |
| `supabase/config.toml` | Habilitar realtime para novas tabelas |

---

## Parte 9: Migração SQL Completa

```sql
-- 1. Tabela de mensagens
CREATE TABLE service_call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('part_request', 'quote_pending', 'approval_needed', 'info_needed', 'schedule_change', 'other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  requires_action BOOLEAN DEFAULT false,
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de menções
CREATE TABLE service_call_message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES service_call_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  notified_via_whatsapp BOOLEAN DEFAULT false,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de anexos
CREATE TABLE service_call_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES service_call_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'document', 'audio')),
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS + Realtime
ALTER TABLE service_call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_call_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE service_call_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE service_call_message_mentions;

-- 6. Inserir templates padrão
INSERT INTO message_templates (title, content, category, display_order) VALUES
('Peça solicitada', 'Necessário comprar: ', 'part_request', 1),
('Peça chegou', 'A peça solicitada chegou e foi enviada.', NULL, 2),
('Orçamento solicitado', 'Cliente solicitou orçamento para: ', 'quote_pending', 3),
('Orçamento enviado', 'Orçamento enviado ao cliente. Valor: R$ ', NULL, 4),
('Aguardando aprovação', 'Aguardando aprovação gerencial para: ', 'approval_needed', 5),
('Serviço concluído', 'Serviço finalizado com sucesso.', NULL, 6),
('Reagendamento', 'Serviço reagendado para: ', 'schedule_change', 7);
```

---

## Parte 10: Ordem de Implementação

### Fase 1 - Fundação (Prioridade Alta)
1. Migração SQL (tabelas + RLS)
2. Hook `useServiceCallMessages` (CRUD básico)
3. Componente `ServiceCallChat` (versão básica)
4. Integração na `ServiceCallView`

### Fase 2 - Menções e Pendências
5. Hook `useAllUsers` (já existe, reutilizar)
6. Componente `UserMentionInput`
7. Lógica de pendências (requires_action)
8. Página `/pendencias` básica

### Fase 3 - Anexos e Templates
9. Upload de anexos para storage
10. Componente `ChatAttachments`
11. Hook `useMessageTemplates`
12. Dropdown de templates

### Fase 4 - SLA e Alertas
13. Lógica de prazos e vencimentos
14. Cores dinâmicas (atrasado/no prazo)
15. Badge contador no menu
16. Filtros no dashboard

### Fase 5 - Realtime e WhatsApp
17. Subscription Realtime
18. Integração com sistema de notificações
19. Notificação WhatsApp opcional
20. Histórico de resoluções

---

## Resumo de Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Centralização** | Toda comunicação fica na OS, não se perde em WhatsApp |
| **Rastreabilidade** | Histórico completo de pedidos e decisões |
| **Visibilidade** | Gerência vê todas as pendências em um dashboard |
| **Agilidade** | Templates aceleram comunicação no mobile |
| **SLA** | Prazos garantem que nada seja esquecido |
| **Notificações** | Usuários são alertados por múltiplos canais |
| **Documentação** | Anexos de fotos/NFs ficam vinculados ao contexto |
