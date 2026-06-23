-- ============================================================================
-- Correção de privilégios da fiscal_settings
-- ----------------------------------------------------------------------------
-- A migration original (20260617000000_fiscal_settings.sql) criou a tabela sem
-- conceder GRANTs aos roles do Supabase. Como GRANT de tabela é independente do
-- bypass de RLS, a edge function (service_role) recebia "permission denied for
-- table fiscal_settings" (SQLSTATE 42501) ao ler a configuração na emissão.
--
-- A RLS continua controlando o acesso por linha (apenas Gerencial via UI;
-- service_role bypassa). Aqui só liberamos o privilégio de tabela, igual às
-- demais tabelas de configuração (ex.: system_settings).
-- ============================================================================

GRANT SELECT ON TABLE public.fiscal_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.fiscal_settings TO authenticated, service_role;
