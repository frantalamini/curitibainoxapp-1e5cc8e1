-- =====================================================
-- Sistema de Chat Interno por OS - Fase 1: Fundação
-- =====================================================

-- 1. Tabela principal de mensagens
CREATE TABLE public.service_call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
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
CREATE TABLE public.service_call_message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.service_call_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  notified_via_whatsapp BOOLEAN DEFAULT false,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de anexos
CREATE TABLE public.service_call_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.service_call_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'document', 'audio')),
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de templates de mensagens
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('part_request', 'quote_pending', 'approval_needed', 'info_needed', 'schedule_change', 'other')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Índices para performance
CREATE INDEX idx_service_call_messages_service_call_id ON public.service_call_messages(service_call_id);
CREATE INDEX idx_service_call_messages_author_id ON public.service_call_messages(author_id);
CREATE INDEX idx_service_call_messages_requires_action ON public.service_call_messages(requires_action) WHERE requires_action = true AND resolved_at IS NULL;
CREATE INDEX idx_service_call_messages_due_date ON public.service_call_messages(due_date) WHERE due_date IS NOT NULL AND resolved_at IS NULL;
CREATE INDEX idx_service_call_message_mentions_message_id ON public.service_call_message_mentions(message_id);
CREATE INDEX idx_service_call_message_mentions_user_id ON public.service_call_message_mentions(mentioned_user_id);
CREATE INDEX idx_service_call_message_attachments_message_id ON public.service_call_message_attachments(message_id);

-- 6. Trigger para atualizar updated_at
CREATE TRIGGER update_service_call_messages_updated_at
  BEFORE UPDATE ON public.service_call_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Habilitar RLS em todas as tabelas
ALTER TABLE public.service_call_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies para service_call_messages
-- =====================================================

-- Admins podem ver todas as mensagens
CREATE POLICY "Admins can view all messages"
  ON public.service_call_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Técnicos podem ver mensagens das OS atribuídas a eles, onde são autores ou mencionados
CREATE POLICY "Technicians can view relevant messages"
  ON public.service_call_messages
  FOR SELECT
  USING (
    has_role(auth.uid(), 'technician'::app_role) AND (
      -- É o autor
      author_id = auth.uid()
      OR
      -- É mencionado
      EXISTS (
        SELECT 1 FROM public.service_call_message_mentions m
        WHERE m.message_id = service_call_messages.id
        AND m.mentioned_user_id = auth.uid()
      )
      OR
      -- É o técnico responsável da OS
      EXISTS (
        SELECT 1 FROM public.service_calls sc
        JOIN public.technicians t ON sc.technician_id = t.id
        WHERE sc.id = service_call_messages.service_call_id
        AND t.user_id = auth.uid()
      )
    )
  );

-- Admins podem criar mensagens em qualquer OS
CREATE POLICY "Admins can insert messages"
  ON public.service_call_messages
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Técnicos podem criar mensagens nas OS atribuídas a eles
CREATE POLICY "Technicians can insert messages in assigned OS"
  ON public.service_call_messages
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'technician'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.service_calls sc
      JOIN public.technicians t ON sc.technician_id = t.id
      WHERE sc.id = service_call_messages.service_call_id
      AND t.user_id = auth.uid()
    )
  );

-- Admins podem atualizar (resolver) qualquer mensagem
CREATE POLICY "Admins can update messages"
  ON public.service_call_messages
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Apenas gerencial pode deletar mensagens
CREATE POLICY "Only gerencial can delete messages"
  ON public.service_call_messages
  FOR DELETE
  USING (get_user_profile_type(auth.uid()) = 'gerencial'::profile_type);

-- =====================================================
-- RLS Policies para service_call_message_mentions
-- =====================================================

-- Admins podem ver todas as menções
CREATE POLICY "Admins can view all mentions"
  ON public.service_call_message_mentions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuários podem ver menções onde são mencionados
CREATE POLICY "Users can view their own mentions"
  ON public.service_call_message_mentions
  FOR SELECT
  USING (mentioned_user_id = auth.uid());

-- Técnicos podem ver menções de mensagens que podem ver
CREATE POLICY "Technicians can view mentions of visible messages"
  ON public.service_call_message_mentions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'technician'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.service_call_messages msg
      WHERE msg.id = service_call_message_mentions.message_id
      AND (
        msg.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.service_calls sc
          JOIN public.technicians t ON sc.technician_id = t.id
          WHERE sc.id = msg.service_call_id
          AND t.user_id = auth.uid()
        )
      )
    )
  );

-- Admins e técnicos podem inserir menções
CREATE POLICY "Admins can insert mentions"
  ON public.service_call_message_mentions
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Technicians can insert mentions"
  ON public.service_call_message_mentions
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'technician'::app_role));

-- Usuários podem atualizar suas próprias menções (marcar como visto)
CREATE POLICY "Users can update their own mentions"
  ON public.service_call_message_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Apenas gerencial pode deletar menções
CREATE POLICY "Only gerencial can delete mentions"
  ON public.service_call_message_mentions
  FOR DELETE
  USING (get_user_profile_type(auth.uid()) = 'gerencial'::profile_type);

-- =====================================================
-- RLS Policies para service_call_message_attachments
-- =====================================================

-- Admins podem ver todos os anexos
CREATE POLICY "Admins can view all attachments"
  ON public.service_call_message_attachments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Técnicos podem ver anexos de mensagens que podem ver
CREATE POLICY "Technicians can view attachments of visible messages"
  ON public.service_call_message_attachments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'technician'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.service_call_messages msg
      WHERE msg.id = service_call_message_attachments.message_id
      AND (
        msg.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.service_call_message_mentions m
          WHERE m.message_id = msg.id AND m.mentioned_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.service_calls sc
          JOIN public.technicians t ON sc.technician_id = t.id
          WHERE sc.id = msg.service_call_id
          AND t.user_id = auth.uid()
        )
      )
    )
  );

-- Admins e técnicos podem inserir anexos
CREATE POLICY "Admins can insert attachments"
  ON public.service_call_message_attachments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Technicians can insert attachments"
  ON public.service_call_message_attachments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'technician'::app_role));

-- Apenas gerencial pode deletar anexos
CREATE POLICY "Only gerencial can delete attachments"
  ON public.service_call_message_attachments
  FOR DELETE
  USING (get_user_profile_type(auth.uid()) = 'gerencial'::profile_type);

-- =====================================================
-- RLS Policies para message_templates
-- =====================================================

-- Todos os usuários autenticados podem ver templates ativos
CREATE POLICY "Authenticated users can view active templates"
  ON public.message_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Apenas admins podem gerenciar templates
CREATE POLICY "Admins can manage templates"
  ON public.message_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- Habilitar Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_call_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_call_message_mentions;

-- =====================================================
-- Inserir templates padrão
-- =====================================================
INSERT INTO public.message_templates (title, content, category, display_order) VALUES
  ('Peça solicitada', 'Necessário comprar: ', 'part_request', 1),
  ('Peça chegou', 'A peça solicitada chegou e foi enviada.', NULL, 2),
  ('Orçamento solicitado', 'Cliente solicitou orçamento para: ', 'quote_pending', 3),
  ('Orçamento enviado', 'Orçamento enviado ao cliente. Valor: R$ ', NULL, 4),
  ('Aguardando aprovação', 'Aguardando aprovação gerencial para: ', 'approval_needed', 5),
  ('Serviço concluído', 'Serviço finalizado com sucesso.', NULL, 6),
  ('Reagendamento', 'Serviço reagendado para: ', 'schedule_change', 7);

-- =====================================================
-- Criar bucket para anexos de chat (se não existir)
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para anexos de chat
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view chat attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Only gerencial can delete chat attachments"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'chat-attachments' AND get_user_profile_type(auth.uid()) = 'gerencial'::profile_type);