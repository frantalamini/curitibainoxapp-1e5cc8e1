-- Create technician_reimbursements table for expense tracking
CREATE TABLE public.technician_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  receipt_photo_url TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  ocr_extracted_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'REJECTED')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.technician_reimbursements IS 'Stores technician expense reimbursement requests with receipt photos';

-- Enable RLS
ALTER TABLE public.technician_reimbursements ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own reimbursements
CREATE POLICY "Technicians can view their own reimbursements"
ON public.technician_reimbursements
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'technician'::app_role) 
    AND EXISTS (
      SELECT 1 FROM technicians t 
      WHERE t.id = technician_reimbursements.technician_id 
      AND t.user_id = auth.uid()
    )
  )
);

-- Technicians can insert their own reimbursements
CREATE POLICY "Technicians can insert reimbursements"
ON public.technician_reimbursements
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'technician'::app_role)
  AND EXISTS (
    SELECT 1 FROM technicians t 
    WHERE t.id = technician_reimbursements.technician_id 
    AND t.user_id = auth.uid()
  )
);

-- Admins can update any reimbursement (for approval/payment)
CREATE POLICY "Admins can update reimbursements"
ON public.technician_reimbursements
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete reimbursements"
ON public.technician_reimbursements
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_technician_reimbursements_updated_at
BEFORE UPDATE ON public.technician_reimbursements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();