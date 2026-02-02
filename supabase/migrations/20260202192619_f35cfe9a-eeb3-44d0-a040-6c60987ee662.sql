-- Corrigir a política INSERT para ser mais restritiva
-- Apenas o trigger (SECURITY DEFINER) pode inserir, não usuários diretos
DROP POLICY IF EXISTS "System can insert notifications" ON public.in_app_notifications;

-- Criar política que permite admins inserirem (para casos manuais)
CREATE POLICY "Admins can insert notifications"
  ON public.in_app_notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));