-- Tabela de notificações in-app
CREATE TABLE public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_in_app_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_read_at ON public.in_app_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_in_app_notifications_type ON public.in_app_notifications(type);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications"
  ON public.in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- Função para criar notificação de menção automaticamente
CREATE OR REPLACE FUNCTION public.create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_os_number integer;
  v_author_name text;
  v_service_call_id uuid;
BEGIN
  -- Buscar informações da mensagem e OS
  SELECT 
    sc.os_number,
    sc.id,
    COALESCE(p.full_name, 'Alguém')
  INTO v_os_number, v_service_call_id, v_author_name
  FROM service_call_messages msg
  JOIN service_calls sc ON sc.id = msg.service_call_id
  LEFT JOIN profiles p ON p.user_id = msg.author_id
  WHERE msg.id = NEW.message_id;

  -- Criar notificação para o usuário mencionado
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
    '/service-calls/' || v_service_call_id,
    jsonb_build_object(
      'service_call_id', v_service_call_id,
      'os_number', v_os_number,
      'message_id', NEW.message_id,
      'author_name', v_author_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar após inserção de menção
CREATE TRIGGER on_mention_created
  AFTER INSERT ON public.service_call_message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mention_notification();