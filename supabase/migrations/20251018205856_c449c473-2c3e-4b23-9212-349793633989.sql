-- Remove the existing public access policy for technicians
DROP POLICY IF EXISTS "Everyone can view active technicians" ON public.technicians;

-- Create new policy requiring authentication to view active technicians
CREATE POLICY "Authenticated users can view active technicians"
ON public.technicians
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND active = true) 
  OR has_role(auth.uid(), 'admin'::app_role)
);
