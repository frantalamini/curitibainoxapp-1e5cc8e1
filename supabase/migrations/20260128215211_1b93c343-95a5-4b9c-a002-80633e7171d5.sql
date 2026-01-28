-- Fix: Restrict INSERT and UPDATE on clients table to admins only
-- Technicians should only be able to VIEW clients associated with their active service calls

-- Drop existing permissive INSERT policy for technicians
DROP POLICY IF EXISTS "Admins and technicians can insert clients" ON public.clients;

-- Drop existing permissive UPDATE policy for technicians
DROP POLICY IF EXISTS "Admins and technicians can update clients" ON public.clients;

-- Create new INSERT policy - admins only
CREATE POLICY "Only admins can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create new UPDATE policy - admins only
CREATE POLICY "Only admins can update clients"
ON public.clients
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));