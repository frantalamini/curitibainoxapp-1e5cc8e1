-- Adicionar novos campos de endereço detalhado à tabela clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
ADD COLUMN IF NOT EXISTS street VARCHAR(200),
ADD COLUMN IF NOT EXISTS number VARCHAR(20),
ADD COLUMN IF NOT EXISTS complement VARCHAR(100),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50);

-- Tornar o campo address opcional para compatibilidade
ALTER TABLE public.clients
ALTER COLUMN address DROP NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.clients.cep IS 'CEP formatado (00000-000)';
COMMENT ON COLUMN public.clients.street IS 'Nome da rua/logradouro';
COMMENT ON COLUMN public.clients.number IS 'Número do imóvel';
COMMENT ON COLUMN public.clients.complement IS 'Complemento (apto, sala, etc)';
COMMENT ON COLUMN public.clients.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.clients.city IS 'Cidade';
COMMENT ON COLUMN public.clients.state IS 'Sigla UF (PR, SP, etc)';
COMMENT ON COLUMN public.clients.state_registration IS 'Inscrição Estadual do contribuinte';

-- Criar índice para facilitar buscas por cidade/estado
CREATE INDEX IF NOT EXISTS idx_clients_city_state ON public.clients(city, state);