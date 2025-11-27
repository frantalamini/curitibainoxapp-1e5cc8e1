-- 1. Criar tabela de status de chamados técnicos
CREATE TABLE public.service_call_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color VARCHAR NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger para updated_at
CREATE TRIGGER update_service_call_statuses_updated_at
  BEFORE UPDATE ON public.service_call_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Inserir status padrão
INSERT INTO public.service_call_statuses (name, color, display_order) VALUES
  ('Aguardando Início', '#fbbf24', 1),
  ('Em Andamento', '#3b82f6', 2),
  ('Com Pendências', '#f97316', 3),
  ('Finalizado', '#22c55e', 4),
  ('Cancelado', '#ef4444', 5);

-- 4. Adicionar coluna status_id na service_calls
ALTER TABLE public.service_calls 
ADD COLUMN status_id UUID REFERENCES public.service_call_statuses(id);

-- 5. Migrar dados existentes (mapear enum para novos IDs)
UPDATE public.service_calls sc
SET status_id = (
  SELECT id FROM public.service_call_statuses scs
  WHERE (scs.name = 'Aguardando Início' AND sc.status = 'pending')
     OR (scs.name = 'Em Andamento' AND sc.status = 'in_progress')
     OR (scs.name = 'Com Pendências' AND sc.status = 'on_hold')
     OR (scs.name = 'Finalizado' AND sc.status = 'completed')
     OR (scs.name = 'Cancelado' AND sc.status = 'cancelled')
  LIMIT 1
);

-- 6. Configurar RLS para service_call_statuses
ALTER TABLE public.service_call_statuses ENABLE ROW LEVEL SECURITY;

-- Admins e técnicos podem visualizar
CREATE POLICY "Admins and technicians can view statuses"
  ON public.service_call_statuses FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert statuses"
  ON public.service_call_statuses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar
CREATE POLICY "Only admins can update statuses"
  ON public.service_call_statuses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete statuses"
  ON public.service_call_statuses FOR DELETE
  USING (has_role(auth.uid(), 'admin'));