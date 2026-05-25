-- ============================================================
-- Sprint de Segurança: Corrigir RLS do módulo de compras
-- Troca USING(true) por check_profile_permission + has_role
-- ============================================================

-- ============================================================
-- 1. Registrar módulos de compras no profile_permissions
-- ============================================================

-- Buscar IDs dos perfis existentes
DO $$
DECLARE
  v_gerencial_id UUID;
  v_admin_id     UUID;
  v_tecnico_id   UUID;
  v_mod TEXT;
BEGIN
  SELECT id INTO v_gerencial_id FROM access_profiles WHERE name = 'Gerencial';
  SELECT id INTO v_admin_id     FROM access_profiles WHERE name = 'Administrativo';
  SELECT id INTO v_tecnico_id   FROM access_profiles WHERE name = 'Técnico';

  -- Módulos de compras (apenas Gerencial tem acesso total; Admin e Técnico bloqueados)
  FOR v_mod IN SELECT unnest(ARRAY[
    'compras', 'compras_solicitacoes', 'compras_cotacoes',
    'compras_pedidos', 'compras_recebimentos', 'compras_nf_entrada'
  ])
  LOOP
    -- Gerencial: acesso total
    INSERT INTO profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
    VALUES (v_gerencial_id, v_mod, true, true, true, true, true)
    ON CONFLICT (profile_id, module) DO NOTHING;

    -- Administrativo: somente visualizar e consultar
    INSERT INTO profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
    VALUES (v_admin_id, v_mod, true, true, false, false, false)
    ON CONFLICT (profile_id, module) DO NOTHING;

    -- Técnico: bloqueado total
    INSERT INTO profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
    VALUES (v_tecnico_id, v_mod, false, false, false, false, false)
    ON CONFLICT (profile_id, module) DO NOTHING;
  END LOOP;
END$$;

-- ============================================================
-- 2. DROP todas as policies permissivas das tabelas de compras
-- ============================================================

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
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON %I', tbl, tbl);
  END LOOP;
END$$;

-- ============================================================
-- 3. Criar novas policies baseadas em check_profile_permission
-- ============================================================

-- Mapeamento tabela → módulo:
--   purchase_requests / purchase_request_items → compras_solicitacoes
--   purchase_quotations / purchase_quotation_items → compras_cotacoes
--   purchase_orders / purchase_order_items → compras_pedidos
--   purchase_receipts / purchase_receipt_items → compras_recebimentos
--   purchase_invoices → compras_nf_entrada

-- === purchase_requests ===
CREATE POLICY "rls_select_purchase_requests" ON purchase_requests
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'view'));

CREATE POLICY "rls_insert_purchase_requests" ON purchase_requests
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'create'));

CREATE POLICY "rls_update_purchase_requests" ON purchase_requests
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'edit'));

CREATE POLICY "rls_delete_purchase_requests" ON purchase_requests
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'delete'));

-- === purchase_request_items ===
CREATE POLICY "rls_select_purchase_request_items" ON purchase_request_items
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'view'));

CREATE POLICY "rls_insert_purchase_request_items" ON purchase_request_items
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'create'));

CREATE POLICY "rls_update_purchase_request_items" ON purchase_request_items
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'edit'));

CREATE POLICY "rls_delete_purchase_request_items" ON purchase_request_items
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_solicitacoes', 'delete'));

-- === purchase_quotations ===
CREATE POLICY "rls_select_purchase_quotations" ON purchase_quotations
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'view'));

CREATE POLICY "rls_insert_purchase_quotations" ON purchase_quotations
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_cotacoes', 'create'));

CREATE POLICY "rls_update_purchase_quotations" ON purchase_quotations
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'edit'));

CREATE POLICY "rls_delete_purchase_quotations" ON purchase_quotations
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'delete'));

-- === purchase_quotation_items ===
CREATE POLICY "rls_select_purchase_quotation_items" ON purchase_quotation_items
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'view'));

CREATE POLICY "rls_insert_purchase_quotation_items" ON purchase_quotation_items
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_cotacoes', 'create'));

CREATE POLICY "rls_update_purchase_quotation_items" ON purchase_quotation_items
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'edit'));

CREATE POLICY "rls_delete_purchase_quotation_items" ON purchase_quotation_items
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_cotacoes', 'delete'));

-- === purchase_orders ===
CREATE POLICY "rls_select_purchase_orders" ON purchase_orders
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'view'));

CREATE POLICY "rls_insert_purchase_orders" ON purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_pedidos', 'create'));

CREATE POLICY "rls_update_purchase_orders" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'edit'));

CREATE POLICY "rls_delete_purchase_orders" ON purchase_orders
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'delete'));

-- === purchase_order_items ===
CREATE POLICY "rls_select_purchase_order_items" ON purchase_order_items
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'view'));

CREATE POLICY "rls_insert_purchase_order_items" ON purchase_order_items
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_pedidos', 'create'));

CREATE POLICY "rls_update_purchase_order_items" ON purchase_order_items
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'edit'));

CREATE POLICY "rls_delete_purchase_order_items" ON purchase_order_items
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_pedidos', 'delete'));

-- === purchase_receipts ===
CREATE POLICY "rls_select_purchase_receipts" ON purchase_receipts
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'view'));

CREATE POLICY "rls_insert_purchase_receipts" ON purchase_receipts
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_recebimentos', 'create'));

CREATE POLICY "rls_update_purchase_receipts" ON purchase_receipts
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'edit'));

CREATE POLICY "rls_delete_purchase_receipts" ON purchase_receipts
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'delete'));

-- === purchase_receipt_items ===
CREATE POLICY "rls_select_purchase_receipt_items" ON purchase_receipt_items
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'view'));

CREATE POLICY "rls_insert_purchase_receipt_items" ON purchase_receipt_items
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_recebimentos', 'create'));

CREATE POLICY "rls_update_purchase_receipt_items" ON purchase_receipt_items
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'edit'));

CREATE POLICY "rls_delete_purchase_receipt_items" ON purchase_receipt_items
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_recebimentos', 'delete'));

-- === purchase_invoices ===
CREATE POLICY "rls_select_purchase_invoices" ON purchase_invoices
  FOR SELECT TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_nf_entrada', 'view'));

CREATE POLICY "rls_insert_purchase_invoices" ON purchase_invoices
  FOR INSERT TO authenticated
  WITH CHECK (check_profile_permission(auth.uid(), 'compras_nf_entrada', 'create'));

CREATE POLICY "rls_update_purchase_invoices" ON purchase_invoices
  FOR UPDATE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_nf_entrada', 'edit'));

CREATE POLICY "rls_delete_purchase_invoices" ON purchase_invoices
  FOR DELETE TO authenticated
  USING (check_profile_permission(auth.uid(), 'compras_nf_entrada', 'delete'));

-- ============================================================
-- 4. Corrigir service_call_status_log (migrar de user_permissions legado)
-- ============================================================

DROP POLICY IF EXISTS "admin_gerencial_select_status_log" ON service_call_status_log;

CREATE POLICY "rls_select_service_call_status_log" ON service_call_status_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR check_profile_permission(auth.uid(), 'service_calls', 'view')
  );
