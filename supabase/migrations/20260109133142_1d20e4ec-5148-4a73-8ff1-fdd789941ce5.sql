-- Adicionar coluna de expiração do token (14 dias por padrão)
ALTER TABLE public.service_calls 
ADD COLUMN report_token_expires_at TIMESTAMP WITH TIME ZONE 
DEFAULT (now() + interval '14 days');

-- Atualizar tokens existentes com expiração de 14 dias a partir de agora
UPDATE public.service_calls 
SET report_token_expires_at = now() + interval '14 days'
WHERE report_access_token IS NOT NULL;