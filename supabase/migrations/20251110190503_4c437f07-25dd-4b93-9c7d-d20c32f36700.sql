-- Fix 1: Restrict technicians to only see clients they're assigned to via service calls
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Technicians can only view assigned clients" ON public.clients;

-- Create new restrictive policy for technicians
CREATE POLICY "Technicians see only assigned clients"
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
    )
  )
);

-- Fix 2: Make the storage bucket private (cannot add RLS policies to storage.objects via migration)
UPDATE storage.buckets 
SET public = false 
WHERE name = 'service-call-attachments';