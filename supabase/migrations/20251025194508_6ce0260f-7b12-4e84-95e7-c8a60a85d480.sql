-- Adicionar novo valor 'colaborador' ao enum cadastro_tipo
ALTER TYPE cadastro_tipo ADD VALUE IF NOT EXISTS 'colaborador';

-- Adicionar nova coluna tipos como array
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tipos cadastro_tipo[] DEFAULT ARRAY['cliente']::cadastro_tipo[];

-- Migrar dados existentes (tipo único -> array com 1 elemento)
UPDATE public.clients 
SET tipos = ARRAY[tipo]::cadastro_tipo[]
WHERE tipo IS NOT NULL AND (tipos IS NULL OR tipos = '{}');

-- Criar índice GIN para busca eficiente em arrays
CREATE INDEX IF NOT EXISTS idx_clients_tipos_gin ON public.clients USING GIN (tipos);

-- Adicionar Telefone 2
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS phone_2 TEXT;

-- Adicionar Responsável Legal
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS responsible_legal JSONB DEFAULT NULL;

COMMENT ON COLUMN public.clients.tipos IS 'Array de tipos de cadastro (cliente, fornecedor, transportador, colaborador, outro)';
COMMENT ON COLUMN public.clients.phone_2 IS 'Telefone secundário do cadastro';
COMMENT ON COLUMN public.clients.responsible_legal IS 'Dados do responsável legal: {name, phone, email}';