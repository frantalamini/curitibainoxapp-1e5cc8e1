-- 1. Excluir todos os cadastros existentes
DELETE FROM clients;

-- 2. Criar sequência para código do cliente (se não existir)
CREATE SEQUENCE IF NOT EXISTS clients_number_seq START WITH 1;

-- 3. Adicionar coluna client_number com valor sequencial automático
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS client_number INTEGER UNIQUE DEFAULT nextval('clients_number_seq');