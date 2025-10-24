-- Criar ENUM para tipo de cadastro
CREATE TYPE public.cadastro_tipo AS ENUM (
  'cliente',
  'fornecedor',
  'transportador',
  'funcionario',
  'outro'
);

-- Adicionar coluna tipo à tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS tipo public.cadastro_tipo DEFAULT 'cliente';

-- Adicionar nome fantasia (opcional)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_tipo ON public.clients(tipo);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients(full_name);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);

-- Atualizar registros existentes para tipo 'cliente'
UPDATE public.clients SET tipo = 'cliente' WHERE tipo IS NULL;