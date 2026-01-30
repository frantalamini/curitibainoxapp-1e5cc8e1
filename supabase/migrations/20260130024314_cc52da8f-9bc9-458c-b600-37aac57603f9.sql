-- Table for recurring transactions (expenses and revenues)
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  direction public.transaction_direction NOT NULL,
  category_id UUID REFERENCES public.financial_categories(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  financial_account_id UUID REFERENCES public.financial_accounts(id),
  client_id UUID REFERENCES public.clients(id),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_month DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for admins
CREATE POLICY "Admins can manage recurring transactions"
  ON public.recurring_transactions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient queries
CREATE INDEX idx_recurring_transactions_active ON public.recurring_transactions(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();