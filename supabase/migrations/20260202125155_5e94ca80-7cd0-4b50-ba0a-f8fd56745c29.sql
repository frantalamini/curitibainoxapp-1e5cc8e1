-- Adicionar colunas Fabricante e Setor na tabela service_calls
ALTER TABLE service_calls 
ADD COLUMN IF NOT EXISTS equipment_manufacturer TEXT,
ADD COLUMN IF NOT EXISTS equipment_sector TEXT;