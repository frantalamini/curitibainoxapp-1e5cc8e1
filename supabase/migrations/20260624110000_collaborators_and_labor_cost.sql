-- Colaboradores + custo hora-homem
-- Toda pessoa que custa à empresa (técnico, comprador, administrativo...).
-- O custo hora-homem mora aqui e é consumido pela OS (via técnico) e, no futuro,
-- pelo módulo de orçamento. Dados de custo são de USO INTERNO (gerencial).

-- Tipo de vínculo: define quais encargos incidem.
DO $$ BEGIN
  CREATE TYPE public.employment_type AS ENUM ('clt', 'mei_pj');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  role_title TEXT,                                  -- função (ex: Técnico, Comprador)
  employment_type public.employment_type NOT NULL DEFAULT 'clt',
  attends_os BOOLEAN NOT NULL DEFAULT false,        -- aparece como técnico nas OS

  -- Bloco de custos (uso interno / gerencial)
  base_salary NUMERIC NOT NULL DEFAULT 0,           -- salário (CLT) ou valor mensal da nota (MEI/PJ)
  monthly_hours NUMERIC NOT NULL DEFAULT 220,       -- carga horária mensal (divisor do hora-homem)
  -- adicionais: [{ "name": "Insalubridade", "value": 600, "incides_charges": true }, ...]
  additionals JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefit_meal NUMERIC NOT NULL DEFAULT 0,          -- vale refeição
  benefit_food NUMERIC NOT NULL DEFAULT 0,          -- vale alimentação
  benefit_transport NUMERIC NOT NULL DEFAULT 0,     -- auxílio transporte
  benefit_fuel NUMERIC NOT NULL DEFAULT 0,          -- auxílio combustível
  cost_per_hour NUMERIC NOT NULL DEFAULT 0,         -- hora-homem calculado (cache)

  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.collaborators IS
  'Pessoas que custam à empresa (técnicos e não-técnicos). Custo hora-homem para cálculo de margem da OS e orçamento. Uso interno.';

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Padrão deste banco: acesso a qualquer autenticado; a proteção "só gerencial vê
-- custos" é feita no frontend (menu + telas), como no resto do app.
CREATE POLICY "authenticated_all"
  ON public.collaborators FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_collaborators_attends_os
  ON public.collaborators(attends_os) WHERE attends_os = true;

-- Vínculo técnico -> colaborador (de onde sai o custo do técnico na OS).
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.collaborators(id);

CREATE INDEX IF NOT EXISTS idx_technicians_collaborator
  ON public.technicians(collaborator_id);
