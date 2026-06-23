-- ============================================================================
-- Configurações Fiscais (Emissor de NF) — fonte única de parametrização
-- ----------------------------------------------------------------------------
-- Guarda TODOS os parâmetros de emissão de NF (NFSe/NFe) lidos pela edge
-- function de emissão. Modelo data-driven/vendável: cada cliente que usa o app
-- configura a sua empresa aqui e o sistema se parametriza sozinho.
--
-- Tabela de 1 linha (como system_settings). Tokens NÃO são semeados aqui
-- (cada cliente digita o seu na tela; nunca no código/git).
-- Acesso restrito a Gerencial (UI); a edge function lê via service_role.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.fiscal_settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Provedor / ambiente
  provider                 text NOT NULL DEFAULT 'focus_nfe',
  ambiente                 text NOT NULL DEFAULT 'homologacao'
                             CHECK (ambiente IN ('homologacao','producao')),
  token_homologacao        text,
  token_producao           text,
  -- Dados do emissor (prestador)
  cnpj                     text,
  inscricao_estadual       text,
  inscricao_municipal      text,
  regime_tributario        text,            -- simples_nacional | lucro_presumido | lucro_real | mei
  optante_simples_nacional boolean NOT NULL DEFAULT false,
  incentivador_cultural    boolean NOT NULL DEFAULT false,
  codigo_municipio         text,            -- IBGE (Pinhais = 4119152)
  -- Parâmetros do serviço (NFSe)
  codigo_servico           text,            -- ex: 1400201 (assistência técnica)
  item_lista_servico       text,            -- ex: 14.02
  nbs                      text,            -- ex: 1.2001.60.00
  cnae                     text,
  aliquota_iss             numeric,         -- % (a confirmar com contador)
  iss_retido               boolean NOT NULL DEFAULT false,
  natureza_operacao        text,
  -- Templates de texto (placeholders: {os}, {oc}, {equipamento}, {forma_pagamento})
  discriminacao_template   text NOT NULL DEFAULT 'Manutenção de {equipamento} - OS{os} OC{oc}',
  observacoes_template     text NOT NULL DEFAULT 'Manutenção de {equipamento} - OS{os} OC{oc} - Forma de pagamento: {forma_pagamento}',
  -- Auditoria
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid
);

-- Linha única, pré-preenchida com o que já sabemos da Frigonox/Pinhais.
-- Copia CNPJ/IE do system_settings; tokens ficam NULL (preencher na tela).
INSERT INTO public.fiscal_settings
  (provider, ambiente, cnpj, inscricao_estadual, codigo_municipio,
   codigo_servico, item_lista_servico, nbs, regime_tributario,
   discriminacao_template, observacoes_template)
SELECT
  'focus_nfe', 'homologacao',
  s.company_cnpj, s.company_ie, '4119152',         -- Pinhais/PR (IBGE)
  '1400201', '14.02', '1.2001.60.00', 'simples_nacional',
  'Manutenção de {equipamento} - OS{os} OC{oc}',
  'Manutenção de {equipamento} - OS{os} OC{oc} - Forma de pagamento: {forma_pagamento}'
FROM public.system_settings s
WHERE NOT EXISTS (SELECT 1 FROM public.fiscal_settings)
LIMIT 1;

-- Fallback: se não houver system_settings, garante 1 linha mesmo assim
INSERT INTO public.fiscal_settings (provider, ambiente, codigo_municipio,
   codigo_servico, item_lista_servico, nbs)
SELECT 'focus_nfe', 'homologacao', '4119152', '1400201', '14.02', '1.2001.60.00'
WHERE NOT EXISTS (SELECT 1 FROM public.fiscal_settings);

-- RLS: somente Gerencial gerencia/lê (edge function usa service_role e bypassa)
ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencial manage fiscal settings" ON public.fiscal_settings;
CREATE POLICY "Gerencial manage fiscal settings"
  ON public.fiscal_settings FOR ALL
  TO authenticated
  USING (public.is_gerencial_user(auth.uid()))
  WITH CHECK (public.is_gerencial_user(auth.uid()));

COMMIT;
