-- Create enum types for items and transactions
CREATE TYPE item_type AS ENUM ('PRODUCT', 'SERVICE', 'FEE', 'DISCOUNT');
CREATE TYPE transaction_direction AS ENUM ('RECEIVE', 'PAY');
CREATE TYPE transaction_origin AS ENUM ('SERVICE_CALL', 'MANUAL');
CREATE TYPE transaction_status AS ENUM ('OPEN', 'PAID', 'CANCELED', 'PARTIAL');

-- Create products table (catalog)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text,
  name text NOT NULL,
  description text,
  unit text DEFAULT 'un',
  unit_price numeric DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Only Admin can manage products
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create service_call_items table (OS items)
CREATE TABLE public.service_call_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id uuid NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  type item_type NOT NULL,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  qty numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount_value numeric DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_call_items ENABLE ROW LEVEL SECURITY;

-- Only Admin can manage service call items (Technician CANNOT see)
CREATE POLICY "Admins can manage service call items" ON public.service_call_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create financial_transactions table (receivables/payables)
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction transaction_direction NOT NULL,
  origin transaction_origin NOT NULL,
  status transaction_status DEFAULT 'OPEN',
  service_call_id uuid REFERENCES public.service_calls(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  amount numeric NOT NULL,
  discount numeric DEFAULT 0,
  interest numeric DEFAULT 0,
  payment_method text,
  installment_number integer,
  installments_total integer,
  installments_group_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Only Admin can manage financial transactions
CREATE POLICY "Admins can manage financial transactions" ON public.financial_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));