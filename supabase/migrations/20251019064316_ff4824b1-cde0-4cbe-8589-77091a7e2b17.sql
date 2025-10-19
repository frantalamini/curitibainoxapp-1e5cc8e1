-- Adicionar campos JSONB para responsáveis no estabelecimento
ALTER TABLE clients 
ADD COLUMN responsible_financial JSONB DEFAULT NULL,
ADD COLUMN responsible_technical JSONB DEFAULT NULL;

COMMENT ON COLUMN clients.responsible_financial IS 'Responsável Financeiro: { "name": "string", "role": "string", "phone": "string" }';
COMMENT ON COLUMN clients.responsible_technical IS 'Responsável Acompanhamento Técnico: { "name": "string", "role": "string", "phone": "string" }';