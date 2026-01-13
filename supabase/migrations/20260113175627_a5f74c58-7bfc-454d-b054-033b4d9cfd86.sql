-- Expandir tabela products com novos campos
ALTER TABLE products ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ncm text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cest text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_icms numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_pis numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_cofins numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock numeric;

-- Criar enum para tipo de movimentação de estoque
DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT', 'ADJUST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  qty numeric NOT NULL,
  unit_cost numeric,
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem movimentações
CREATE POLICY "Admins can manage stock movements" ON stock_movements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar view para saldo de estoque por produto
CREATE OR REPLACE VIEW product_stock_balance AS
SELECT 
  product_id,
  COALESCE(SUM(
    CASE 
      WHEN type = 'IN' THEN qty 
      WHEN type = 'OUT' THEN -qty 
      WHEN type = 'ADJUST' THEN qty
      ELSE 0 
    END
  ), 0) as balance
FROM stock_movements
GROUP BY product_id;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);