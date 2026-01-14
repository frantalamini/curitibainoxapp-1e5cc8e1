-- Adicionar colunas de desconto na tabela service_calls
ALTER TABLE public.service_calls 
  ADD COLUMN IF NOT EXISTS discount_parts_type text DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS discount_parts_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_services_type text DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS discount_services_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total_type text DEFAULT 'value',
  ADD COLUMN IF NOT EXISTS discount_total_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_config jsonb DEFAULT '{}';

-- Adicionar campo interval_days na tabela financial_transactions
ALTER TABLE public.financial_transactions 
  ADD COLUMN IF NOT EXISTS interval_days integer DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.service_calls.discount_parts_type IS 'Tipo de desconto para peças: percent ou value';
COMMENT ON COLUMN public.service_calls.discount_parts_value IS 'Valor do desconto para peças';
COMMENT ON COLUMN public.service_calls.discount_services_type IS 'Tipo de desconto para serviços: percent ou value';
COMMENT ON COLUMN public.service_calls.discount_services_value IS 'Valor do desconto para serviços';
COMMENT ON COLUMN public.service_calls.discount_total_type IS 'Tipo de desconto total da OS: percent ou value';
COMMENT ON COLUMN public.service_calls.discount_total_value IS 'Valor do desconto total da OS';
COMMENT ON COLUMN public.service_calls.payment_config IS 'Configuração de pagamento: data_inicio, dias_parcelas, formas_pagamento';
COMMENT ON COLUMN public.financial_transactions.interval_days IS 'Intervalo em dias para cálculo de vencimento da parcela';