-- Add user_id column to technicians table to link with authenticated users
ALTER TABLE public.technicians 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure each user can only be linked to one technician record
ALTER TABLE public.technicians 
ADD CONSTRAINT technicians_user_id_unique UNIQUE(user_id);

-- Drop the existing policy that allows all authenticated users to view active technicians
DROP POLICY IF EXISTS "Authenticated users can view active technicians" ON public.technicians;

-- Create new policy: Technicians can view their own profile, admins can view all
CREATE POLICY "Technicians can view their own profile"
ON public.technicians 
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy: Technicians can update their own profile
CREATE POLICY "Technicians can update their own profile"
ON public.technicians 
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);