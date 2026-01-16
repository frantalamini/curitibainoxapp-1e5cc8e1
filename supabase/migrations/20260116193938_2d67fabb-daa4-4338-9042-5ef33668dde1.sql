-- Adicionar campos para integração financeira completa
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS financial_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS description TEXT;