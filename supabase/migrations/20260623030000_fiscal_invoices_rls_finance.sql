-- ============================================================================
-- RLS da fiscal_invoices alinhada ao módulo financeiro
-- ----------------------------------------------------------------------------
-- A policy original só permitia Gerencial (is_gerencial_user), então usuários
-- do perfil Financeiro (que acessam a aba Financeiro da OS) NÃO viam as notas
-- emitidas — a OS aparecia "sem nota" e exibia o botão de emitir.
--
-- Alinhamos com o mesmo controle das demais tabelas financeiras
-- (financial_transactions): leitura liberada para quem tem consulta no módulo
-- 'finances'. As mutações continuam exclusivamente pela edge function
-- (service_role, que bypassa RLS).
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Gerencial manage fiscal invoices" ON public.fiscal_invoices;

CREATE POLICY "fin_select_fiscal_invoices"
  ON public.fiscal_invoices
  FOR SELECT
  TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'finances', 'consult'));

COMMIT;
