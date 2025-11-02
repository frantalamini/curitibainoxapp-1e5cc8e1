-- Adicionar coluna para número de série do equipamento
ALTER TABLE service_calls 
ADD COLUMN equipment_serial_number TEXT NULL;

-- Adicionar coluna para observações internas (texto)
ALTER TABLE service_calls 
ADD COLUMN internal_notes_text TEXT NULL;

-- Adicionar coluna para observações internas (áudio)
ALTER TABLE service_calls 
ADD COLUMN internal_notes_audio_url TEXT NULL;

-- Comentários descritivos
COMMENT ON COLUMN service_calls.equipment_serial_number IS 'Número de série do equipamento';
COMMENT ON COLUMN service_calls.internal_notes_text IS 'Observações internas visíveis apenas para admin/técnicos (até 2000 caracteres)';
COMMENT ON COLUMN service_calls.internal_notes_audio_url IS 'URL do áudio das observações internas';