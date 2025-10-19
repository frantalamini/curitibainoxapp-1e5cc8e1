-- Remover coluna urgency da tabela service_calls
ALTER TABLE public.service_calls 
  DROP COLUMN IF EXISTS urgency;