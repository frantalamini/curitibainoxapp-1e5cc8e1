-- 1. Criar enum para status do veículo
CREATE TYPE public.vehicle_status AS ENUM ('ativo', 'inativo', 'em_manutencao');

-- 2. Criar enum para tipo de manutenção
CREATE TYPE public.maintenance_type AS ENUM ('preventiva', 'corretiva', 'colisao');

-- 3. Adicionar novos campos na tabela vehicles
ALTER TABLE public.vehicles 
ADD COLUMN brand TEXT,
ADD COLUMN status vehicle_status DEFAULT 'ativo' NOT NULL;

-- 4. Migrar dados existentes: active -> status
UPDATE public.vehicles SET status = 'ativo' WHERE active = true;
UPDATE public.vehicles SET status = 'inativo' WHERE active = false;

-- 5. Criar tabela vehicle_maintenances (histórico de manutenções)
CREATE TABLE public.vehicle_maintenances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  maintenance_type maintenance_type NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Habilitar RLS na tabela vehicle_maintenances
ALTER TABLE public.vehicle_maintenances ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para vehicle_maintenances
CREATE POLICY "Admins and technicians can view vehicle maintenances"
  ON public.vehicle_maintenances FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Only admins can insert vehicle maintenances"
  ON public.vehicle_maintenances FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update vehicle maintenances"
  ON public.vehicle_maintenances FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete vehicle maintenances"
  ON public.vehicle_maintenances FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Índice para consultas de manutenção em aberto
CREATE INDEX idx_vehicle_maintenances_open 
  ON public.vehicle_maintenances(vehicle_id) 
  WHERE finished_at IS NULL;