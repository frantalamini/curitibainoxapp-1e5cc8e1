-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  card_brand TEXT, -- Visa, Mastercard, etc.
  last_digits TEXT, -- últimos 4 dígitos
  credit_limit NUMERIC DEFAULT 0,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31), -- dia do vencimento da fatura
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31), -- dia de fechamento/corte
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin only
CREATE POLICY "Admins can manage credit cards"
  ON public.credit_cards
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add credit_card_id column to financial_transactions
ALTER TABLE public.financial_transactions
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Add column to track which billing cycle a transaction belongs to
ALTER TABLE public.financial_transactions
ADD COLUMN credit_card_statement_date DATE;

-- Create trigger for updated_at
CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();