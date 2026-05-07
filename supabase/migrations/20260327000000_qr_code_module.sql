-- ============================================================
-- MIGRATION: Modulo QR Code
-- Data: 2026-03-27
-- Objetivo: Criar tabelas para geracao de QR Codes,
--           templates de etiquetas e cadastro de produtos.
-- ============================================================

-- ============================================================
-- FASE 1: TABELA DE PRODUTOS QR
-- ============================================================

CREATE TABLE IF NOT EXISTS public.qr_products (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  model_code      TEXT         NOT NULL,
  category        TEXT,
  description     TEXT,
  serial_format   TEXT         NOT NULL DEFAULT 'prefix_year_seq',  -- prefix_year_seq, sequential, model_seq
  serial_prefix   TEXT         NOT NULL DEFAULT 'CI',
  next_serial     INTEGER      NOT NULL DEFAULT 1,
  lot_format      TEXT         NOT NULL DEFAULT 'lt_year_month',     -- lt_year_month, lt_seq, custom
  lots_generated  INTEGER      NOT NULL DEFAULT 0,
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(model_code)
);

COMMENT ON TABLE public.qr_products IS 'Produtos cadastrados para receber QR Code (etiquetas de fabricacao)';

-- ============================================================
-- FASE 2: TABELA DE TEMPLATES DE ETIQUETAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.qr_templates (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  width_cm        NUMERIC(5,1) NOT NULL DEFAULT 10.0,
  height_cm       NUMERIC(5,1) NOT NULL DEFAULT 5.0,
  -- Posicoes: 0=esq.sup, 1=centro.sup, 2=dir.sup, 3=esq.centro, 4=centro, 5=dir.centro, 6=esq.inf, 7=centro.inf, 8=dir.inf
  logo_position   INTEGER      NOT NULL DEFAULT 0,
  logo_size_cm    NUMERIC(4,1) NOT NULL DEFAULT 2.0,
  qr_position     INTEGER      NOT NULL DEFAULT 6,
  qr_size_cm      NUMERIC(4,1) NOT NULL DEFAULT 2.5,
  bg_enabled      BOOLEAN      NOT NULL DEFAULT true,
  bg_width_pct    INTEGER      NOT NULL DEFAULT 35,
  bg_color        TEXT         NOT NULL DEFAULT '#18487A',
  -- Elementos de texto como JSONB array
  -- Cada item: { type: "titulo"|"subtitulo"|"texto"|"rodape", content: string, font_size: number, bold: boolean, color: string, is_variable: boolean }
  text_elements   JSONB        NOT NULL DEFAULT '[]'::jsonb,
  -- Elementos extras (linhas, retangulos, imagens)
  extra_elements  JSONB        NOT NULL DEFAULT '[]'::jsonb,
  times_used      INTEGER      NOT NULL DEFAULT 0,
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qr_templates IS 'Templates de etiquetas para impressao de QR Codes';

-- ============================================================
-- FASE 3: TABELA DE QR CODES GERADOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT         NOT NULL UNIQUE,  -- codigo unico do QR (ex: CI-2026-00483)
  qr_type         TEXT         NOT NULL DEFAULT 'fabricated',  -- fabricated, assistance
  -- Vinculo com produto (fabricados)
  product_id      UUID         REFERENCES public.qr_products(id) ON DELETE SET NULL,
  lot_number      TEXT,
  serial_number   TEXT,
  -- Vinculo com equipamento/cliente (assistencia - preenchido depois em campo)
  equipment_id    UUID         REFERENCES public.equipment(id) ON DELETE SET NULL,
  client_id       UUID         REFERENCES public.clients(id) ON DELETE SET NULL,
  -- Template usado
  template_id     UUID         REFERENCES public.qr_templates(id) ON DELETE SET NULL,
  -- Metadados
  batch_id        UUID,        -- agrupa QR codes gerados juntos
  category        TEXT,        -- categoria para assistencia
  destination_url TEXT,        -- URL de destino quando escaneado
  scanned_count   INTEGER      NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  status          TEXT         NOT NULL DEFAULT 'active',  -- active, linked, disabled
  created_by      UUID         REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qr_codes IS 'QR Codes gerados (fabricacao e assistencia tecnica)';

-- ============================================================
-- FASE 4: CONFIGURACOES DO MODULO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.qr_module_settings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key     TEXT         NOT NULL UNIQUE,
  setting_value   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qr_module_settings IS 'Configuracoes do modulo QR Code (WhatsApp, hub links, impressora)';

-- Inserir configuracoes padrao
INSERT INTO public.qr_module_settings (setting_key, setting_value) VALUES
  ('whatsapp', '{"number": "", "default_message": "Ola, preciso de atendimento para o equipamento {equipamento} -- {modelo}"}'::jsonb),
  ('hub_links', '[]'::jsonb),
  ('printing', '{"default_printer": "thermal", "include_phone": true, "include_website": true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- FASE 5: INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_qr_codes_product_id ON public.qr_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_equipment_id ON public.qr_codes(equipment_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_client_id ON public.qr_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON public.qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_type ON public.qr_codes(qr_type);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_products_model_code ON public.qr_products(model_code);
CREATE INDEX IF NOT EXISTS idx_qr_templates_created_by ON public.qr_templates(created_by);

-- ============================================================
-- FASE 6: RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.qr_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_module_settings ENABLE ROW LEVEL SECURITY;

-- Politicas: usuarios autenticados podem ler e escrever
CREATE POLICY "qr_products_select" ON public.qr_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "qr_products_insert" ON public.qr_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "qr_products_update" ON public.qr_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "qr_products_delete" ON public.qr_products FOR DELETE TO authenticated USING (true);

CREATE POLICY "qr_templates_select" ON public.qr_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "qr_templates_insert" ON public.qr_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "qr_templates_update" ON public.qr_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "qr_templates_delete" ON public.qr_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "qr_codes_select" ON public.qr_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "qr_codes_insert" ON public.qr_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "qr_codes_update" ON public.qr_codes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "qr_codes_delete" ON public.qr_codes FOR DELETE TO authenticated USING (true);

CREATE POLICY "qr_settings_select" ON public.qr_module_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "qr_settings_update" ON public.qr_module_settings FOR UPDATE TO authenticated USING (true);

-- Pagina hub publica: QR codes podem ser lidos por anonimos (para quando cliente escaneia)
CREATE POLICY "qr_codes_public_read" ON public.qr_codes FOR SELECT TO anon USING (status = 'active' OR status = 'linked');
