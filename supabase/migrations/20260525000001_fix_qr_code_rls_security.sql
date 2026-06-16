-- ============================================================
-- Hardening Sprint: Corrigir RLS do módulo QR Code
-- Troca USING(true) por check_profile_permission
-- Data: 2026-05-25
-- ============================================================
-- CONTEXTO:
--   As 4 tabelas do módulo QR Code foram criadas com USING(true),
--   permitindo que QUALQUER usuário autenticado faça SELECT/INSERT/
--   UPDATE/DELETE sem restrição de perfil.
--
--   O frontend já bloqueia via RoutePermissionGuard:
--     - qr_products/qr_templates/qr_codes → module='products'
--     - qr_module_settings → module='settings'
--
--   Esta migration espelha essa lógica no banco.
--
-- PERMISSÕES RESULTANTES:
--   Gerencial:      products (view✅ create✅ edit✅) + settings (view✅ edit✅)
--   Administrativo: products (view✅ create✅ edit✅) + settings (❌)
--   Técnico:        products (view✅ create❌ edit❌) + settings (❌)
--
-- ROLLBACK: Ver seção no final deste arquivo
-- ============================================================

-- ============================================================
-- 1. DROP todas as policies permissivas (USING(true))
-- ============================================================

-- qr_products (4 policies)
DROP POLICY IF EXISTS "qr_products_select" ON public.qr_products;
DROP POLICY IF EXISTS "qr_products_insert" ON public.qr_products;
DROP POLICY IF EXISTS "qr_products_update" ON public.qr_products;
DROP POLICY IF EXISTS "qr_products_delete" ON public.qr_products;

-- qr_templates (4 policies)
DROP POLICY IF EXISTS "qr_templates_select" ON public.qr_templates;
DROP POLICY IF EXISTS "qr_templates_insert" ON public.qr_templates;
DROP POLICY IF EXISTS "qr_templates_update" ON public.qr_templates;
DROP POLICY IF EXISTS "qr_templates_delete" ON public.qr_templates;

-- qr_codes (4 policies — NÃO tocar em qr_codes_public_read!)
DROP POLICY IF EXISTS "qr_codes_select" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_insert" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_update" ON public.qr_codes;
DROP POLICY IF EXISTS "qr_codes_delete" ON public.qr_codes;

-- qr_module_settings (2 policies)
DROP POLICY IF EXISTS "qr_settings_select" ON public.qr_module_settings;
DROP POLICY IF EXISTS "qr_settings_update" ON public.qr_module_settings;

-- ============================================================
-- 2. Criar novas policies com check_profile_permission
-- ============================================================

-- === qr_products → módulo 'products' ===
CREATE POLICY "rls_select_qr_products" ON public.qr_products
  FOR SELECT TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'view'));

CREATE POLICY "rls_insert_qr_products" ON public.qr_products
  FOR INSERT TO authenticated
  WITH CHECK (public.check_profile_permission(auth.uid(), 'products', 'create'));

CREATE POLICY "rls_update_qr_products" ON public.qr_products
  FOR UPDATE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'edit'));

CREATE POLICY "rls_delete_qr_products" ON public.qr_products
  FOR DELETE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'delete'));

-- === qr_templates → módulo 'products' ===
CREATE POLICY "rls_select_qr_templates" ON public.qr_templates
  FOR SELECT TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'view'));

CREATE POLICY "rls_insert_qr_templates" ON public.qr_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.check_profile_permission(auth.uid(), 'products', 'create'));

CREATE POLICY "rls_update_qr_templates" ON public.qr_templates
  FOR UPDATE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'edit'));

CREATE POLICY "rls_delete_qr_templates" ON public.qr_templates
  FOR DELETE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'delete'));

-- === qr_codes → módulo 'products' ===
-- NOTA: policy "qr_codes_public_read" (anon) foi PRESERVADA para o hub público
CREATE POLICY "rls_select_qr_codes" ON public.qr_codes
  FOR SELECT TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'view'));

CREATE POLICY "rls_insert_qr_codes" ON public.qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.check_profile_permission(auth.uid(), 'products', 'create'));

CREATE POLICY "rls_update_qr_codes" ON public.qr_codes
  FOR UPDATE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'edit'));

CREATE POLICY "rls_delete_qr_codes" ON public.qr_codes
  FOR DELETE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'products', 'delete'));

-- === qr_module_settings → módulo 'settings' ===
CREATE POLICY "rls_select_qr_settings" ON public.qr_module_settings
  FOR SELECT TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'settings', 'view'));

CREATE POLICY "rls_update_qr_settings" ON public.qr_module_settings
  FOR UPDATE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'settings', 'edit'));

-- ============================================================
-- ROLLBACK (executar manualmente se necessário):
-- ============================================================
--
-- DROP POLICY IF EXISTS "rls_select_qr_products" ON public.qr_products;
-- DROP POLICY IF EXISTS "rls_insert_qr_products" ON public.qr_products;
-- DROP POLICY IF EXISTS "rls_update_qr_products" ON public.qr_products;
-- DROP POLICY IF EXISTS "rls_delete_qr_products" ON public.qr_products;
-- DROP POLICY IF EXISTS "rls_select_qr_templates" ON public.qr_templates;
-- DROP POLICY IF EXISTS "rls_insert_qr_templates" ON public.qr_templates;
-- DROP POLICY IF EXISTS "rls_update_qr_templates" ON public.qr_templates;
-- DROP POLICY IF EXISTS "rls_delete_qr_templates" ON public.qr_templates;
-- DROP POLICY IF EXISTS "rls_select_qr_codes" ON public.qr_codes;
-- DROP POLICY IF EXISTS "rls_insert_qr_codes" ON public.qr_codes;
-- DROP POLICY IF EXISTS "rls_update_qr_codes" ON public.qr_codes;
-- DROP POLICY IF EXISTS "rls_delete_qr_codes" ON public.qr_codes;
-- DROP POLICY IF EXISTS "rls_select_qr_settings" ON public.qr_module_settings;
-- DROP POLICY IF EXISTS "rls_update_qr_settings" ON public.qr_module_settings;
--
-- CREATE POLICY "qr_products_select" ON public.qr_products FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "qr_products_insert" ON public.qr_products FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "qr_products_update" ON public.qr_products FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "qr_products_delete" ON public.qr_products FOR DELETE TO authenticated USING (true);
-- CREATE POLICY "qr_templates_select" ON public.qr_templates FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "qr_templates_insert" ON public.qr_templates FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "qr_templates_update" ON public.qr_templates FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "qr_templates_delete" ON public.qr_templates FOR DELETE TO authenticated USING (true);
-- CREATE POLICY "qr_codes_select" ON public.qr_codes FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "qr_codes_insert" ON public.qr_codes FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "qr_codes_update" ON public.qr_codes FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "qr_codes_delete" ON public.qr_codes FOR DELETE TO authenticated USING (true);
-- CREATE POLICY "qr_settings_select" ON public.qr_module_settings FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "qr_settings_update" ON public.qr_module_settings FOR UPDATE TO authenticated USING (true);
