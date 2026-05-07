-- ============================================================
-- MÓDULO DE COMPRAS — Fases 1 + 2
-- Solicitações, Cotações, Pedidos, Recebimentos, NF Entrada
-- ============================================================

-- ============================================================
-- FASE 1 — Solicitações, Cotações, Pedidos
-- ============================================================

-- 1. Solicitações de Compra
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number SERIAL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','ORDERED','CANCELLED')),
  service_call_id UUID REFERENCES service_calls(id),
  equipment_id UUID REFERENCES equipment(id),
  client_id UUID REFERENCES clients(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Itens da Solicitação
CREATE TABLE purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES purchase_requests(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'UN',
  estimated_unit_cost NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cotações
CREATE TABLE purchase_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number SERIAL,
  request_id UUID REFERENCES purchase_requests(id),
  supplier_id UUID REFERENCES clients(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','RECEIVED','SELECTED','REJECTED','EXPIRED')),
  sent_at TIMESTAMPTZ,
  response_deadline DATE,
  received_at TIMESTAMPTZ,
  payment_terms TEXT,
  delivery_days INT,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Itens da Cotação
CREATE TABLE purchase_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES purchase_quotations(id) ON DELETE CASCADE NOT NULL,
  request_item_id UUID REFERENCES purchase_request_items(id),
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'UN',
  unit_cost NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pedidos de Compra
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','SENT','PARTIAL','RECEIVED','CANCELLED')),
  quotation_id UUID REFERENCES purchase_quotations(id),
  request_id UUID REFERENCES purchase_requests(id),
  supplier_id UUID REFERENCES clients(id) NOT NULL,
  service_call_id UUID REFERENCES service_calls(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  subtotal NUMERIC(12,2) DEFAULT 0,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_value NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  payment_terms TEXT,
  expected_delivery DATE,
  delivery_address TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Itens do Pedido de Compra
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty NUMERIC(12,4) NOT NULL,
  unit TEXT DEFAULT 'UN',
  unit_cost NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  qty_received NUMERIC(12,4) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FASE 2 — Recebimentos e NF de Entrada
-- ============================================================

-- 7. Recebimentos
CREATE TABLE purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number SERIAL,
  order_id UUID REFERENCES purchase_orders(id) NOT NULL,
  supplier_id UUID REFERENCES clients(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','INSPECTING','APPROVED','REJECTED','PARTIAL')),
  received_at TIMESTAMPTZ DEFAULT now(),
  received_by UUID REFERENCES auth.users(id),
  inspection_notes TEXT,
  has_divergence BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Itens do Recebimento
CREATE TABLE purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES purchase_receipts(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES purchase_order_items(id),
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty_expected NUMERIC(12,4) NOT NULL,
  qty_received NUMERIC(12,4) NOT NULL,
  qty_rejected NUMERIC(12,4) DEFAULT 0,
  unit_cost NUMERIC(12,2),
  rejection_reason TEXT,
  batch_number TEXT,
  expiry_date DATE,
  stock_updated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. NF de Entrada
CREATE TABLE purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  invoice_series TEXT DEFAULT '1',
  invoice_key TEXT,
  order_id UUID REFERENCES purchase_orders(id),
  receipt_id UUID REFERENCES purchase_receipts(id),
  supplier_id UUID REFERENCES clients(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','VALIDATED','BOOKED','CANCELLED')),
  issue_date DATE NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  freight NUMERIC(12,2) DEFAULT 0,
  insurance NUMERIC(12,2) DEFAULT 0,
  other_costs NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  icms_base NUMERIC(12,2) DEFAULT 0,
  icms_value NUMERIC(12,2) DEFAULT 0,
  ipi_value NUMERIC(12,2) DEFAULT 0,
  pis_value NUMERIC(12,2) DEFAULT 0,
  cofins_value NUMERIC(12,2) DEFAULT 0,
  financial_generated BOOLEAN DEFAULT false,
  xml_content TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_pr_status ON purchase_requests(status);
CREATE INDEX idx_pr_service_call ON purchase_requests(service_call_id);
CREATE INDEX idx_pr_requested_by ON purchase_requests(requested_by);
CREATE INDEX idx_pq_supplier ON purchase_quotations(supplier_id);
CREATE INDEX idx_pq_request ON purchase_quotations(request_id);
CREATE INDEX idx_pq_status ON purchase_quotations(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_quotation ON purchase_orders(quotation_id);
CREATE INDEX idx_prec_order ON purchase_receipts(order_id);
CREATE INDEX idx_prec_status ON purchase_receipts(status);
CREATE INDEX idx_pi_order ON purchase_invoices(order_id);
CREATE INDEX idx_pi_supplier ON purchase_invoices(supplier_id);
CREATE INDEX idx_pi_number ON purchase_invoices(invoice_number);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;

-- Policies para authenticated users
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'purchase_requests','purchase_request_items',
    'purchase_quotations','purchase_quotation_items',
    'purchase_orders','purchase_order_items',
    'purchase_receipts','purchase_receipt_items',
    'purchase_invoices'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "auth_select_%s" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END$$;

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'purchase_requests','purchase_quotations','purchase_orders',
    'purchase_receipts','purchase_invoices'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl
    );
  END LOOP;
END$$;
