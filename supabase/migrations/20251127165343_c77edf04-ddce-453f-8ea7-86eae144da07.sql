-- Criar enum para status do deslocamento
CREATE TYPE public.trip_status AS ENUM ('em_deslocamento', 'concluido');

-- Criar tabela de deslocamentos
CREATE TABLE public.service_call_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_call_id UUID REFERENCES public.service_calls(id) ON DELETE CASCADE NOT NULL,
  technician_id UUID REFERENCES public.technicians(id) NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  start_odometer_km NUMERIC NOT NULL,
  end_odometer_km NUMERIC,
  distance_km NUMERIC,
  status trip_status NOT NULL DEFAULT 'em_deslocamento',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.service_call_trips ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins and technicians can view trips"
  ON public.service_call_trips FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Admins and technicians can insert trips"
  ON public.service_call_trips FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Admins and technicians can update trips"
  ON public.service_call_trips FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Only admins can delete trips"
  ON public.service_call_trips FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_service_call_trips_service_call ON public.service_call_trips(service_call_id);
CREATE INDEX idx_service_call_trips_status ON public.service_call_trips(status) WHERE status = 'em_deslocamento';