-- ============================================================================
-- Anti-duplicação por OS + tipo + AMBIENTE
-- ----------------------------------------------------------------------------
-- O índice original (uniq_active_invoice_per_os_tipo) não distinguia ambiente,
-- então uma nota ativa de homologação bloquearia a emissão em produção da mesma
-- OS. Recriamos incluindo `ambiente` para que os dois ambientes coexistam sem
-- colidir (continua: no máx. 1 nota ativa por OS+tipo dentro de cada ambiente).
-- ============================================================================

BEGIN;

DROP INDEX IF EXISTS public.uniq_active_invoice_per_os_tipo;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_invoice_per_os_tipo
  ON public.fiscal_invoices (service_call_id, tipo, ambiente)
  WHERE status IN ('processando', 'autorizado');

COMMIT;
