-- Adicionar coluna seen_by_tech_at na tabela service_calls
ALTER TABLE public.service_calls
ADD COLUMN seen_by_tech_at timestamp with time zone DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.service_calls.seen_by_tech_at IS 
  'Timestamp de quando o técnico visualizou o chamado pela primeira vez';