-- Create payment_methods table for configurable payment methods
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_methods (admin can CRUD, authenticated can read)
CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

-- Insert default payment methods
INSERT INTO public.payment_methods (name, sort_order) VALUES
  ('Dinheiro', 1),
  ('PIX', 2),
  ('Cartão de Crédito', 3),
  ('Cartão de Débito', 4),
  ('Boleto', 5),
  ('Transferência', 6),
  ('Cheque', 7),
  ('BNDES', 8),
  ('Permuta', 9),
  ('Marketplace', 10);

-- Add discount_type column to service_call_items for line-item discount type
ALTER TABLE public.service_call_items
  ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'value' CHECK (discount_type IN ('percent', 'value'));

-- Trigger for updated_at on payment_methods
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();