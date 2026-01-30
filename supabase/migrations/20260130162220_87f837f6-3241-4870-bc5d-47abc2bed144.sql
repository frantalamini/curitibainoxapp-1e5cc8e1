-- Enum para status de venda
CREATE TYPE sale_status AS ENUM ('QUOTE', 'APPROVED', 'SALE', 'INVOICED', 'CANCELLED');

-- Adicionar SALE ao transaction_origin
ALTER TYPE transaction_origin ADD VALUE 'SALE';

-- Sequência para numeração de vendas
CREATE SEQUENCE IF NOT EXISTS sales_number_seq START 1;

-- Tabela principal de vendas
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number integer NOT NULL DEFAULT nextval('sales_number_seq'::regclass),
  status sale_status NOT NULL DEFAULT 'QUOTE',
  client_id uuid NOT NULL REFERENCES clients(id),
  seller_id uuid REFERENCES profiles(user_id),
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'value',
  discount_value numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  commission_percent numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  notes text,
  quote_valid_until date,
  approved_at timestamptz,
  invoiced_at timestamptz,
  invoice_number text,
  payment_config jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Itens da venda
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'value',
  discount_value numeric DEFAULT 0,
  total numeric NOT NULL,
  stock_deducted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Policies para sales (apenas admin)
CREATE POLICY "Admins can manage sales" ON public.sales
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para sale_items (apenas admin)
CREATE POLICY "Admins can manage sale items" ON public.sale_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_sales_client_id ON public.sales(client_id);
CREATE INDEX idx_sales_seller_id ON public.sales(seller_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON public.sale_items(product_id);