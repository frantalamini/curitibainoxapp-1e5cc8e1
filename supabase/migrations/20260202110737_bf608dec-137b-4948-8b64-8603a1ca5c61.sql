-- =============================================================================
-- Migration: Permitir que técnicos visualizem TODOS os chamados
-- =============================================================================

-- 1. Alterar política de SELECT em service_calls
-- Antes: técnicos viam apenas chamados atribuídos a eles
-- Depois: técnicos veem todos os chamados
DROP POLICY IF EXISTS "Technicians see only assigned calls, admins see all" ON public.service_calls;

CREATE POLICY "Admins and technicians can view all service calls"
ON public.service_calls
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'technician'::app_role)
);

-- 2. Alterar política de SELECT em clients
-- Antes: técnicos viam apenas clientes de chamados atribuídos a eles
-- Depois: técnicos veem todos os clientes que têm chamados ativos
DROP POLICY IF EXISTS "Technicians see only active assignment clients" ON public.clients;

CREATE POLICY "Technicians see clients with active service calls"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'technician'::app_role) 
    AND EXISTS (
      SELECT 1 FROM service_calls sc
      WHERE sc.client_id = clients.id
      AND sc.status NOT IN ('completed'::service_status, 'cancelled'::service_status)
    )
  )
);

-- 3. Alterar política de SELECT em service_call_markers
-- Antes: técnicos viam apenas marcadores de chamados atribuídos
-- Depois: técnicos veem marcadores de todos os chamados
DROP POLICY IF EXISTS "Users can view markers of accessible service calls" ON public.service_call_markers;

CREATE POLICY "Admins and technicians can view all markers"
ON public.service_call_markers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'technician'::app_role)
);

-- 4. Alterar política de SELECT em service_call_messages (técnicos)
-- Antes: técnicos viam apenas mensagens de chamados atribuídos
-- Depois: técnicos veem mensagens de todos os chamados
DROP POLICY IF EXISTS "Technicians can view relevant messages" ON public.service_call_messages;

CREATE POLICY "Technicians can view all messages"
ON public.service_call_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'technician'::app_role)
);