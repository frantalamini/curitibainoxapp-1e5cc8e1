-- Fix: Restrict technicians to viewing only clients from ACTIVE service calls
-- This addresses the PII exposure security issue

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Technicians see only assigned clients" ON public.clients;

-- Create stricter policy: technicians see clients only from active (pending/in_progress/on_hold) service calls
CREATE POLICY "Technicians see only active assignment clients" 
ON public.clients FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'technician'::app_role)
    AND EXISTS (
      SELECT 1 FROM service_calls sc
      JOIN technicians t ON sc.technician_id = t.id
      WHERE sc.client_id = clients.id
      AND t.user_id = auth.uid()
      AND sc.status NOT IN ('completed', 'cancelled')
    )
  )
);