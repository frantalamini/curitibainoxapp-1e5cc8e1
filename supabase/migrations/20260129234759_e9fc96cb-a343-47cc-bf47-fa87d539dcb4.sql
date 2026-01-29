-- Add new columns to vehicles table for owner and insurance data
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_document TEXT,
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS insurance_phone TEXT,
ADD COLUMN IF NOT EXISTS insurance_broker TEXT,
ADD COLUMN IF NOT EXISTS insurance_broker_phone TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.vehicles.owner_name IS 'Razão Social ou Nome do Proprietário';
COMMENT ON COLUMN public.vehicles.owner_document IS 'CNPJ ou CPF do Proprietário';
COMMENT ON COLUMN public.vehicles.insurance_company IS 'Nome da Seguradora';
COMMENT ON COLUMN public.vehicles.insurance_phone IS 'Telefone de contato do Seguro';
COMMENT ON COLUMN public.vehicles.insurance_broker IS 'Nome do Corretor de Seguro';
COMMENT ON COLUMN public.vehicles.insurance_broker_phone IS 'Telefone do Corretor de Seguro';
COMMENT ON COLUMN public.vehicles.insurance_policy_url IS 'URL do arquivo da apólice de seguro';