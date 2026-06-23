-- ============================================================================
-- Parâmetros da NFe (produto) na fiscal_settings — Fase 3
-- ----------------------------------------------------------------------------
-- Diferente da NFSe (serviço), a NFe vai à SEFAZ-PR e exige dados fiscais por
-- item. CFOP/CSOSN/CST são da OPERAÇÃO de venda (não por produto) — defaults
-- comuns de venda no estado (Simples Nacional), a serem confirmados pelo
-- contador antes de produção. NCM/origem ficam no cadastro do produto.
-- ============================================================================

BEGIN;

ALTER TABLE public.fiscal_settings
  ADD COLUMN IF NOT EXISTS cfop_padrao            text DEFAULT '5102',
  ADD COLUMN IF NOT EXISTS csosn_padrao           text DEFAULT '102',
  ADD COLUMN IF NOT EXISTS pis_cst                text DEFAULT '49',
  ADD COLUMN IF NOT EXISTS cofins_cst             text DEFAULT '49',
  ADD COLUMN IF NOT EXISTS origem_padrao          text DEFAULT '0',
  ADD COLUMN IF NOT EXISTS serie_nfe              text DEFAULT '1',
  ADD COLUMN IF NOT EXISTS natureza_operacao_nfe  text DEFAULT 'Venda de mercadoria';

-- Garante os defaults na linha existente (caso já criada sem essas colunas)
UPDATE public.fiscal_settings SET
  cfop_padrao           = COALESCE(cfop_padrao, '5102'),
  csosn_padrao          = COALESCE(csosn_padrao, '102'),
  pis_cst               = COALESCE(pis_cst, '49'),
  cofins_cst            = COALESCE(cofins_cst, '49'),
  origem_padrao         = COALESCE(origem_padrao, '0'),
  serie_nfe             = COALESCE(serie_nfe, '1'),
  natureza_operacao_nfe = COALESCE(natureza_operacao_nfe, 'Venda de mercadoria');

COMMIT;
