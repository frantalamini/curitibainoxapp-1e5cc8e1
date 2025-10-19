-- Adicionar coluna os_number do tipo INTEGER
ALTER TABLE service_calls 
ADD COLUMN os_number INTEGER;

-- Criar sequência começando em 3000
CREATE SEQUENCE service_calls_os_number_seq START WITH 3000;

-- Definir valor padrão como próximo número da sequência
ALTER TABLE service_calls 
ALTER COLUMN os_number SET DEFAULT nextval('service_calls_os_number_seq');

-- Adicionar constraint de unicidade
ALTER TABLE service_calls 
ADD CONSTRAINT service_calls_os_number_unique UNIQUE (os_number);

-- Criar índice para performance
CREATE INDEX idx_service_calls_os_number ON service_calls(os_number);

-- Atualizar registros existentes com números sequenciais (3000, 3001, 3002)
-- Ordenar por data de criação para manter ordem cronológica
WITH numbered_calls AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 as row_num
  FROM service_calls
  WHERE os_number IS NULL
)
UPDATE service_calls
SET os_number = 3000 + numbered_calls.row_num
FROM numbered_calls
WHERE service_calls.id = numbered_calls.id;

-- Tornar a coluna obrigatória após preencher os valores existentes
ALTER TABLE service_calls 
ALTER COLUMN os_number SET NOT NULL;