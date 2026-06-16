-- ============================================================
-- Hardening Sprint: Corrigir RLS do Storage (bucket service-call-attachments)
-- Data: 2026-05-25
-- ============================================================
-- CONTEXTO:
--   O bucket 'service-call-attachments' tem 4 policies:
--   1. "Authenticated users can view attachments" (SELECT, auth.role()='authenticated')
--   2. "Public read access to service call attachments" (SELECT, SEM AUTH! ← CRÍTICO)
--   3. "Authenticated users can upload attachments" (INSERT, auth.role()='authenticated')
--   4. "Authenticated users can delete their attachments" (DELETE, auth.role()='authenticated')
--
--   A policy #2 permite que QUALQUER requisição (incluindo anon) leia
--   TODOS os arquivos do bucket via API Supabase, mesmo com public=false.
--   PostgreSQL RLS é permissivo: se UMA policy permite, acesso é concedido.
--
-- CORREÇÃO:
--   - Remover TODAS as 4 policies antigas
--   - Criar 3 novas com check_profile_permission('service_calls', action)
--   - SELECT: can_view (todos os perfis)
--   - INSERT: can_edit (todos os perfis — técnico precisa fazer upload de fotos)
--   - DELETE: can_delete (só Gerencial e Administrativo)
--
-- PERMISSÕES RESULTANTES:
--   Gerencial:      SELECT✅ INSERT✅ DELETE✅
--   Administrativo: SELECT✅ INSERT✅ DELETE✅
--   Técnico:        SELECT✅ INSERT✅ DELETE❌
--   Anon:           SELECT❌ INSERT❌ DELETE❌
--
-- ROLLBACK: Ver seção no final deste arquivo
-- ============================================================

-- ============================================================
-- 1. DROP todas as policies existentes do bucket
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to service call attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their attachments" ON storage.objects;

-- ============================================================
-- 2. Criar novas policies com check_profile_permission
-- ============================================================

-- SELECT: quem pode visualizar OS pode ver os anexos
CREATE POLICY "rls_select_service_attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'service-call-attachments'
    AND public.check_profile_permission(auth.uid(), 'service_calls', 'view')
  );

-- INSERT: quem pode editar OS pode fazer upload de anexos
CREATE POLICY "rls_insert_service_attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'service-call-attachments'
    AND public.check_profile_permission(auth.uid(), 'service_calls', 'edit')
  );

-- DELETE: quem pode deletar OS pode deletar anexos (Técnico não pode)
CREATE POLICY "rls_delete_service_attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'service-call-attachments'
    AND public.check_profile_permission(auth.uid(), 'service_calls', 'delete')
  );

-- ============================================================
-- ROLLBACK (executar manualmente se necessário):
-- ============================================================
--
-- DROP POLICY IF EXISTS "rls_select_service_attachments" ON storage.objects;
-- DROP POLICY IF EXISTS "rls_insert_service_attachments" ON storage.objects;
-- DROP POLICY IF EXISTS "rls_delete_service_attachments" ON storage.objects;
--
-- CREATE POLICY "Public read access to service call attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'service-call-attachments');
--
-- CREATE POLICY "Authenticated users can upload attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'service-call-attachments' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Authenticated users can view attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'service-call-attachments' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Authenticated users can delete their attachments"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'service-call-attachments' AND auth.role() = 'authenticated');
