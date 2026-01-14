-- Add markup column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS markup numeric DEFAULT 0;

COMMENT ON COLUMN products.markup IS 'Percentual de markup para cálculo automático do preço de venda';