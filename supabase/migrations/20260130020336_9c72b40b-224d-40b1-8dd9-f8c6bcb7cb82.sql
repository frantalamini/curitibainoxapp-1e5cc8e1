-- Add DRE group field to financial_categories
ALTER TABLE public.financial_categories 
ADD COLUMN dre_group text DEFAULT NULL;

-- Create category_budgets table for monthly budgets
CREATE TABLE public.category_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category_id, year, month)
);

-- Enable RLS
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admins
CREATE POLICY "Admins can manage category budgets"
ON public.category_budgets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_category_budgets_updated_at
BEFORE UPDATE ON public.category_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining DRE groups
COMMENT ON COLUMN public.financial_categories.dre_group IS 'DRE classification: receitas_vendas, receitas_servicos, cmv_mercadorias, cmv_servicos, despesas_variaveis, despesas_fixas, amortizacoes, parcelamento_impostos';