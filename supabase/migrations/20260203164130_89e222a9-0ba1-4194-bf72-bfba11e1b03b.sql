-- Correção: Permitir que técnicos vejam todos os registros de technicians
-- Isso é necessário para que o JOIN com service_calls funcione corretamente

-- 1. Remover política restritiva que causa o bloqueio
DROP POLICY IF EXISTS "Technicians can view their own profile" ON public.technicians;

-- 2. Criar política permissiva para leitura (SELECT)
-- Técnicos E admins podem ver todos os registros de técnicos
CREATE POLICY "Admins and technicians can view all technicians"
  ON public.technicians
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'technician'::app_role)
  );