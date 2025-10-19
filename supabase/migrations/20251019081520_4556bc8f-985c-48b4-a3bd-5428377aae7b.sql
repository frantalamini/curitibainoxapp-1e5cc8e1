-- Criar tabela para armazenar configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  company_name TEXT DEFAULT 'Curitiba Inox',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração inicial
INSERT INTO public.system_settings (logo_url, company_name)
VALUES (NULL, 'Curitiba Inox');

-- RLS policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de configurações para autenticados"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admin pode atualizar configurações"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();