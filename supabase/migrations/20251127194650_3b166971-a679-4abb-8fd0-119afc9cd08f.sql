-- Criar enum para tipo de status
CREATE TYPE public.status_type AS ENUM ('tecnico', 'comercial');

-- Adicionar coluna na tabela existente
ALTER TABLE public.service_call_statuses 
ADD COLUMN status_type status_type NOT NULL DEFAULT 'tecnico';

-- Comentário explicativo
COMMENT ON COLUMN public.service_call_statuses.status_type IS 
  'Categoria do status: tecnico (andamento do serviço) ou comercial (administrativo/financeiro)';