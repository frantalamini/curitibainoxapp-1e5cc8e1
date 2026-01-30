-- 1. Criar função para verificar se usuário é técnico de uma OS (SECURITY DEFINER evita RLS)
CREATE OR REPLACE FUNCTION public.is_technician_of_service_call(_user_id uuid, _service_call_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM service_calls sc
    JOIN technicians t ON sc.technician_id = t.id
    WHERE sc.id = _service_call_id
      AND t.user_id = _user_id
  )
$$;

-- 2. Remover políticas problemáticas de service_call_messages
DROP POLICY IF EXISTS "Technicians can view relevant messages" ON public.service_call_messages;
DROP POLICY IF EXISTS "Technicians can insert messages in assigned OS" ON public.service_call_messages;

-- 3. Recriar políticas usando a função SECURITY DEFINER
CREATE POLICY "Technicians can view relevant messages"
ON public.service_call_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'technician'::app_role) 
  AND (
    author_id = auth.uid()
    OR is_technician_of_service_call(auth.uid(), service_call_id)
  )
);

CREATE POLICY "Technicians can insert messages in assigned OS"
ON public.service_call_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'technician'::app_role) 
  AND is_technician_of_service_call(auth.uid(), service_call_id)
);

-- 4. Remover políticas problemáticas de service_call_message_mentions
DROP POLICY IF EXISTS "Technicians can view mentions of visible messages" ON public.service_call_message_mentions;

-- 5. Recriar política para menções (sem consultar service_call_messages diretamente)
CREATE POLICY "Technicians can view mentions of assigned OS messages"
ON public.service_call_message_mentions
FOR SELECT
USING (
  has_role(auth.uid(), 'technician'::app_role) 
  AND EXISTS (
    SELECT 1 FROM service_call_messages msg
    WHERE msg.id = service_call_message_mentions.message_id
      AND is_technician_of_service_call(auth.uid(), msg.service_call_id)
  )
);

-- 6. Remover política problemática de attachments
DROP POLICY IF EXISTS "Technicians can view attachments of visible messages" ON public.service_call_message_attachments;

-- 7. Recriar política para attachments (sem recursão)
CREATE POLICY "Technicians can view attachments of assigned OS"
ON public.service_call_message_attachments
FOR SELECT
USING (
  has_role(auth.uid(), 'technician'::app_role) 
  AND EXISTS (
    SELECT 1 FROM service_call_messages msg
    WHERE msg.id = service_call_message_attachments.message_id
      AND is_technician_of_service_call(auth.uid(), msg.service_call_id)
  )
);