-- Herói A — Lucro por chamado: registro de tempo de trabalho + custo/hora do técnico
-- Permite calcular a mão de obra REAL de cada OS e, com ela, o lucro do chamado.
-- IMPORTANTE: estes dados são de CONTROLE INTERNO. Nunca devem aparecer no
-- relatório enviado ao cliente.

-- 1) Custo/hora do técnico (usado no cálculo de mão de obra).
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS cost_per_hour NUMERIC;

COMMENT ON COLUMN public.technicians.cost_per_hour IS
  'Custo interno por hora do técnico (R$/h). Usado para calcular a mão de obra na margem da OS. Nunca exibido ao cliente.';

-- 2) Tipo da sessão de atendimento.
DO $$ BEGIN
  CREATE TYPE public.work_session_type AS ENUM ('trabalho', 'deslocamento', 'espera');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Sessões de atendimento (cronômetro). Cada bloco de presença = 1 linha.
--    Um chamado pode ter várias sessões (técnico parou no pico do restaurante,
--    foi buscar peça, voltou em outro horário, etc).
CREATE TABLE IF NOT EXISTS public.service_call_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.technicians(id),
  session_type public.work_session_type NOT NULL DEFAULT 'trabalho',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  interrupt_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_call_work_sessions IS
  'Sessões de tempo do técnico por OS (cronômetro). Controle interno — não exibir ao cliente.';

ALTER TABLE public.service_call_work_sessions ENABLE ROW LEVEL SECURITY;

-- Padrão deste banco: acesso a qualquer autenticado; controle fino é no frontend.
CREATE POLICY "authenticated_all"
  ON public.service_call_work_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_work_sessions_service_call
  ON public.service_call_work_sessions(service_call_id);
-- Sessão "aberta" (em andamento) por chamado
CREATE INDEX IF NOT EXISTS idx_work_sessions_open
  ON public.service_call_work_sessions(service_call_id) WHERE ended_at IS NULL;
