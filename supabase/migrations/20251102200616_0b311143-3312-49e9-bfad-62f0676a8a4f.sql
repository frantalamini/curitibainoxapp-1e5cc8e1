-- Adicionar novos campos de dados da empresa na tabela system_settings
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS report_logo text,
  ADD COLUMN IF NOT EXISTS company_cnpj text,
  ADD COLUMN IF NOT EXISTS company_ie text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_address text;

COMMENT ON COLUMN public.system_settings.report_logo IS 'Logo específica para relatórios (fallback: logo_url)';
COMMENT ON COLUMN public.system_settings.company_cnpj IS 'CNPJ da empresa para cabeçalho de relatórios';
COMMENT ON COLUMN public.system_settings.company_ie IS 'Inscrição Estadual para cabeçalho de relatórios';
COMMENT ON COLUMN public.system_settings.company_phone IS 'Telefone para cabeçalho de relatórios';
COMMENT ON COLUMN public.system_settings.company_email IS 'E-mail para cabeçalho de relatórios';
COMMENT ON COLUMN public.system_settings.company_website IS 'Site para cabeçalho de relatórios';
COMMENT ON COLUMN public.system_settings.company_address IS 'Endereço completo para cabeçalho de relatórios';