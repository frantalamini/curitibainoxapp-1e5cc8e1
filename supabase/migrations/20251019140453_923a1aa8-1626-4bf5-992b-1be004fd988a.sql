-- Correção de Segurança 1: Restringir acesso de técnicos apenas aos clientes atribuídos
-- Remove política permissiva antiga
DROP POLICY IF EXISTS "Admins and technicians can view all clients" ON public.clients;

-- Cria política restritiva: técnicos só veem clientes dos seus service_calls
CREATE POLICY "Technicians can only view assigned clients"
ON public.clients
FOR SELECT
USING (
  -- Admins continuam vendo todos os clientes
  has_role(auth.uid(), 'admin'::app_role)
  
  OR
  
  -- Técnicos veem apenas clientes onde eles têm service_calls atribuídos
  (
    has_role(auth.uid(), 'technician'::app_role)
    AND EXISTS (
      SELECT 1 
      FROM public.service_calls sc
      JOIN public.technicians t ON sc.technician_id = t.id
      WHERE sc.client_id = clients.id
        AND t.user_id = auth.uid()
    )
  )
);