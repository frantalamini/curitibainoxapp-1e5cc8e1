-- Criar tabela de tipos de serviço
CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color varchar(7) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Admins e técnicos podem ver todos os tipos
CREATE POLICY "Admins and technicians can view service types"
  ON public.service_types FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'technician'::app_role)
  );

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert service types"
  ON public.service_types FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem atualizar
CREATE POLICY "Only admins can update service types"
  ON public.service_types FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete service types"
  ON public.service_types FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna service_type_id na tabela service_calls
ALTER TABLE public.service_calls 
  ADD COLUMN service_type_id uuid REFERENCES public.service_types(id);

-- Índice para performance
CREATE INDEX idx_service_calls_service_type_id 
  ON public.service_calls(service_type_id);

-- Inserir alguns tipos padrão
INSERT INTO public.service_types (name, color) VALUES
  ('Instalação', '#3b82f6'),
  ('Manutenção', '#f59e0b'),
  ('Reparo', '#ef4444'),
  ('Inspeção', '#10b981'),
  ('Troca de Peças', '#8b5cf6');