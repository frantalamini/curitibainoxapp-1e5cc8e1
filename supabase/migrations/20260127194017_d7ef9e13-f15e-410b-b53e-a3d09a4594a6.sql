-- Fix service_calls RLS policy: technicians should only see their assigned service calls
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Admins and technicians can view all service calls" ON public.service_calls;

-- Create a more restrictive SELECT policy
-- Admins can see all, technicians only see service calls assigned to them
CREATE POLICY "Technicians see only assigned calls, admins see all"
ON public.service_calls
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    has_role(auth.uid(), 'technician'::app_role) 
    AND EXISTS (
      SELECT 1 FROM technicians t 
      WHERE t.id = service_calls.technician_id 
      AND t.user_id = auth.uid()
    )
  )
);