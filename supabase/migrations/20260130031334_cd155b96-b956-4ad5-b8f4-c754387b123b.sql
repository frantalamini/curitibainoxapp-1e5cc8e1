-- Adicionar campos de GPS na tabela service_call_trips
ALTER TABLE public.service_call_trips
ADD COLUMN origin_lat NUMERIC,
ADD COLUMN origin_lng NUMERIC,
ADD COLUMN destination_lat NUMERIC,
ADD COLUMN destination_lng NUMERIC,
ADD COLUMN estimated_distance_km NUMERIC,
ADD COLUMN current_lat NUMERIC,
ADD COLUMN current_lng NUMERIC,
ADD COLUMN position_updated_at TIMESTAMP WITH TIME ZONE;

-- Habilitar realtime na tabela para atualização do mapa
ALTER PUBLICATION supabase_realtime ADD TABLE service_call_trips;

-- Comentários para documentação
COMMENT ON COLUMN public.service_call_trips.origin_lat IS 'Latitude da posição do técnico ao iniciar deslocamento';
COMMENT ON COLUMN public.service_call_trips.origin_lng IS 'Longitude da posição do técnico ao iniciar deslocamento';
COMMENT ON COLUMN public.service_call_trips.destination_lat IS 'Latitude do endereço do cliente (geocodificado)';
COMMENT ON COLUMN public.service_call_trips.destination_lng IS 'Longitude do endereço do cliente (geocodificado)';
COMMENT ON COLUMN public.service_call_trips.estimated_distance_km IS 'Distância calculada automaticamente via GPS (Haversine)';
COMMENT ON COLUMN public.service_call_trips.current_lat IS 'Última latitude conhecida do técnico (para mapa)';
COMMENT ON COLUMN public.service_call_trips.current_lng IS 'Última longitude conhecida do técnico (para mapa)';
COMMENT ON COLUMN public.service_call_trips.position_updated_at IS 'Timestamp da última atualização de posição';