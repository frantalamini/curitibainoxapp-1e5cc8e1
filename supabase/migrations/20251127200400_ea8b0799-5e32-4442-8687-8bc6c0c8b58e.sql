-- Criar status "Aguardando aprovação" (comercial)
INSERT INTO service_call_statuses (name, color, status_type, active, display_order, is_default)
VALUES ('Aguardando aprovação', '#f59e0b', 'comercial', true, 0, true);

-- Adicionar coluna commercial_status_id na tabela service_calls
ALTER TABLE public.service_calls 
ADD COLUMN commercial_status_id uuid REFERENCES service_call_statuses(id);

COMMENT ON COLUMN public.service_calls.commercial_status_id IS 
  'Situação comercial do chamado (orçamento/aprovação/faturamento)';