-- Fix: Restrict system_settings read access to admins only
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Permitir leitura de configurações para autenticados" ON public.system_settings;

-- Create new restrictive SELECT policy for admins only
CREATE POLICY "Apenas admin pode visualizar configurações" 
ON public.system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));