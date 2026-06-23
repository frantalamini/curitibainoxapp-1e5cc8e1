-- ============================================================================
-- Notas Fiscais emitidas (fiscal_invoices) + IBGE do tomador (clients)
-- ----------------------------------------------------------------------------
-- Fase 1 da emissão de NF a partir da OS. Uma OS pode gerar N notas
-- (NFSe de serviço agora; NFe de produto na Fase 3). Cada registro guarda o
-- ciclo de vida de uma nota no provedor (Focus NFe): emissão, autorização,
-- cancelamento e erro — tudo dentro do app, sem painel externo.
--
-- A edge function `emitir-nf` insere/atualiza esta tabela via service_role
-- (bypassa RLS). A leitura/gestão manual é restrita a Gerencial (mesmo padrão
-- de fiscal_settings).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Código IBGE do município do TOMADOR (cliente) — exigido na NFSe.
--    A tabela clients só tem city/state por nome; o payload Pinhais/Focus exige
--    o código IBGE (7 dígitos). Preenchido automático via CNPJ (fetch-cnpj-data)
--    ou lookup por CEP no momento da emissão.
-- ----------------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge text;

COMMENT ON COLUMN public.clients.codigo_municipio_ibge IS
  'Código IBGE (7 dígitos) do município do tomador, exigido na NFSe. Preenchido automático via CNPJ/CEP.';

-- ----------------------------------------------------------------------------
-- 2) Notas fiscais emitidas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id             uuid NOT NULL
                                REFERENCES public.service_calls(id) ON DELETE CASCADE,
  tipo                        text NOT NULL DEFAULT 'nfse'
                                CHECK (tipo IN ('nfse','nfe')),
  ambiente                    text NOT NULL DEFAULT 'homologacao'
                                CHECK (ambiente IN ('homologacao','producao')),
  -- Referência única enviada ao Focus (idempotência no provedor)
  ref                         text NOT NULL,
  status                      text NOT NULL DEFAULT 'processando'
                                CHECK (status IN ('processando','autorizado','cancelado','erro')),
  -- Retorno da autorização
  numero                      text,
  codigo_verificacao          text,
  valor                       numeric,
  url_danfse                  text,          -- link do PDF (DANFSe)
  caminho_xml                 text,          -- caminho/URL do XML no provedor
  -- Cancelamento
  justificativa_cancelamento  text,
  cancelled_at                timestamptz,
  -- Erro
  mensagem_erro               text,
  -- Auditoria (payload enviado e resposta bruta do provedor)
  request_payload             jsonb,
  focus_response              jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  created_by                  uuid
);

-- A `ref` é única globalmente (cada tentativa de emissão usa uma ref nova;
-- ref de nota cancelada não é reutilizada).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fiscal_invoices_ref
  ON public.fiscal_invoices (ref);

-- Anti-duplicação: no máximo 1 nota ATIVA (processando/autorizado) por OS+tipo.
-- Ao cancelar (status='cancelado') ou falhar (status='erro'), libera nova emissão.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_invoice_per_os_tipo
  ON public.fiscal_invoices (service_call_id, tipo)
  WHERE status IN ('processando','autorizado');

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_service_call
  ON public.fiscal_invoices (service_call_id);

-- updated_at automático (função padrão do projeto)
DROP TRIGGER IF EXISTS update_fiscal_invoices_updated_at ON public.fiscal_invoices;
CREATE TRIGGER update_fiscal_invoices_updated_at
  BEFORE UPDATE ON public.fiscal_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3) RLS — somente Gerencial lê/gerencia pela UI.
--    A edge function de emissão usa service_role e bypassa o RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencial manage fiscal invoices" ON public.fiscal_invoices;
CREATE POLICY "Gerencial manage fiscal invoices"
  ON public.fiscal_invoices FOR ALL
  TO authenticated
  USING (public.is_gerencial_user(auth.uid()))
  WITH CHECK (public.is_gerencial_user(auth.uid()));

COMMIT;
