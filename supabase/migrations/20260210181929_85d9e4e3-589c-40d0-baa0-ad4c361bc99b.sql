CREATE POLICY "Admins can insert reimbursements"
  ON public.technician_reimbursements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));