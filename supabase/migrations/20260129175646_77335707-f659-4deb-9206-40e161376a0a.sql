-- Adicionar campo "Número da OC" (Ordem de Compra) na tabela service_calls
ALTER TABLE public.service_calls
ADD COLUMN IF NOT EXISTS purchase_order_number text;

-- Adicionar campo "Nome Secundário" na tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS secondary_name text;

-- Comentários para documentação
COMMENT ON COLUMN public.service_calls.purchase_order_number IS 'Número da Ordem de Compra (OC) associada ao chamado';
COMMENT ON COLUMN public.clients.secondary_name IS 'Nome secundário para identificar grupo de empresas ou nome interno';