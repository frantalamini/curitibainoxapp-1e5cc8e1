-- Adicionar coluna para controlar se relatório financeiro foi gerado
-- Quando true, técnicos não podem mais acessar relatórios dessa OS
ALTER TABLE public.service_calls
ADD COLUMN has_financial_report boolean NOT NULL DEFAULT false;