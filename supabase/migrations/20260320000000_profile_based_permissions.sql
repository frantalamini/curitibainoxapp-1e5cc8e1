-- ============================================================
-- MIGRATION: Sistema de Permissões por Perfil
-- Data: 2026-03-20
-- Objetivo: Migrar de permissões por usuário para permissões por perfil.
--           Resolve o acesso indevido de Técnicos ao módulo financeiro.
-- ============================================================

-- ============================================================
-- FASE 1: CRIAR TABELA DE PERFIS DE ACESSO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.access_profiles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  is_system   BOOLEAN     NOT NULL DEFAULT false,  -- perfis do sistema não podem ser excluídos
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name)
);

COMMENT ON TABLE  public.access_profiles IS 'Perfis de acesso do sistema (Gerencial, Administrativo, Técnico, etc.)';
COMMENT ON COLUMN public.access_profiles.is_system IS 'Perfis do sistema (true) não podem ser excluídos pelos usuários';

-- ============================================================
-- FASE 2: CRIAR TABELA DE PERMISSÕES POR PERFIL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_permissions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID         NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  module      TEXT         NOT NULL,  -- TEXT (not enum) para compatibilidade com self-hosted Supabase
  can_view    BOOLEAN      NOT NULL DEFAULT false,   -- Visualizar: ver o item de menu/seção
  can_consult BOOLEAN      NOT NULL DEFAULT false,   -- Consultar: ver o conteúdo
  can_create  BOOLEAN      NOT NULL DEFAULT false,   -- Criar: criar novos itens
  can_edit    BOOLEAN      NOT NULL DEFAULT false,   -- Editar: editar itens existentes
  can_delete  BOOLEAN      NOT NULL DEFAULT false,   -- Excluir: excluir itens
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE(profile_id, module)
);

COMMENT ON TABLE  public.profile_permissions IS 'Matriz de permissões por perfil de acesso e módulo do sistema';
COMMENT ON COLUMN public.profile_permissions.can_view    IS 'Visualizar: usuário vê o item no menu (não necessariamente o conteúdo)';
COMMENT ON COLUMN public.profile_permissions.can_consult IS 'Consultar: usuário pode ver o conteúdo da seção';

-- ============================================================
-- FASE 3: ADICIONAR REFERÊNCIA DE PERFIL NA TABELA DE USUÁRIOS
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_profile_id UUID REFERENCES public.access_profiles(id);

-- ============================================================
-- FASE 4: INSERIR PERFIS PADRÃO DO SISTEMA
-- ============================================================

INSERT INTO public.access_profiles (name, description, is_system, is_active)
VALUES
  ('Gerencial',      'Acesso total ao sistema. Pode gerenciar usuários, perfis e configurações.',                                          true, true),
  ('Administrativo', 'Acesso administrativo. Não acessa módulo financeiro completo ou configurações estruturais.',                         true, true),
  ('Técnico',        'Acesso operacional. Restrito ao necessário para execução de OS. Sem acesso a dados financeiros em hipótese alguma.', true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FASE 5: CONFIGURAR PERMISSÕES DOS PERFIS PADRÃO
-- ============================================================

-- GERENCIAL: Acesso total
INSERT INTO public.profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
SELECT ap.id, m.module::system_module, true, true, true, true, true
FROM public.access_profiles ap,
  (VALUES
    ('service_calls'), ('clients'), ('technicians'), ('vehicles'), ('products'),
    ('equipment'), ('schedule'), ('finances'), ('settings'), ('users'),
    ('checklists'), ('service_types'), ('service_statuses'), ('payment_methods'), ('reimbursements')
  ) m(module)
WHERE ap.name = 'Gerencial'
ON CONFLICT (profile_id, module) DO NOTHING;

-- ADMINISTRATIVO: Operações completas, SEM finanças / SEM configurações / SEM gerenciamento de usuários
INSERT INTO public.profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
SELECT ap.id, m.module::system_module, m.v, m.c, m.cr, m.e, m.d
FROM public.access_profiles ap,
  (VALUES
    ('service_calls',     true,  true,  true,  true,  true),
    ('clients',           true,  true,  true,  true,  false),
    ('technicians',       true,  true,  false, false, false),
    ('vehicles',          true,  true,  false, false, false),
    ('products',          true,  true,  true,  true,  false),
    ('equipment',         true,  true,  true,  true,  false),
    ('schedule',          true,  true,  true,  true,  false),
    ('finances',          false, false, false, false, false),
    ('settings',          false, false, false, false, false),
    ('users',             false, false, false, false, false),
    ('checklists',        true,  true,  true,  true,  false),
    ('service_types',     true,  true,  false, false, false),
    ('service_statuses',  true,  true,  false, false, false),
    ('payment_methods',   true,  true,  false, false, false),
    ('reimbursements',    true,  true,  true,  true,  false)
  ) m(module, v, c, cr, e, d)
WHERE ap.name = 'Administrativo'
ON CONFLICT (profile_id, module) DO NOTHING;

-- TÉCNICO: Somente operacional básico — ZERO acesso financeiro em qualquer forma
INSERT INTO public.profile_permissions (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
SELECT ap.id, m.module::system_module, m.v, m.c, m.cr, m.e, m.d
FROM public.access_profiles ap,
  (VALUES
    ('service_calls',     true,  true,  false, true,  false),
    ('clients',           true,  true,  false, false, false),
    ('technicians',       false, false, false, false, false),
    ('vehicles',          false, false, false, false, false),
    ('products',          true,  true,  false, false, false),
    ('equipment',         true,  true,  false, false, false),
    ('schedule',          true,  true,  false, false, false),
    ('finances',          false, false, false, false, false),  -- BLOQUEADO TOTAL
    ('settings',          false, false, false, false, false),
    ('users',             false, false, false, false, false),
    ('checklists',        true,  true,  false, true,  false),
    ('service_types',     false, false, false, false, false),
    ('service_statuses',  false, false, false, false, false),
    ('payment_methods',   false, false, false, false, false),
    ('reimbursements',    true,  true,  true,  false, false)
  ) m(module, v, c, cr, e, d)
WHERE ap.name = 'Técnico'
ON CONFLICT (profile_id, module) DO NOTHING;

-- ============================================================
-- FASE 6: MIGRAR USUÁRIOS EXISTENTES PARA O NOVO SISTEMA
-- ============================================================

-- Mapear profile_type existente (user_permissions) → access_profile_id (profiles)
UPDATE public.profiles p
SET access_profile_id = (
  SELECT ap.id
  FROM public.access_profiles ap
  WHERE ap.name = CASE up.profile_type
    WHEN 'gerencial' THEN 'Gerencial'
    WHEN 'adm'       THEN 'Administrativo'
    WHEN 'tecnico'   THEN 'Técnico'
    ELSE                  'Técnico'
  END
  LIMIT 1
)
FROM (
  SELECT DISTINCT ON (user_id) user_id, profile_type
  FROM public.user_permissions
  ORDER BY user_id, created_at DESC
) up
WHERE up.user_id = p.user_id
AND p.access_profile_id IS NULL;

-- Para usuários sem registro em user_permissions: atribuir Técnico como padrão seguro
UPDATE public.profiles p
SET access_profile_id = (SELECT id FROM public.access_profiles WHERE name = 'Técnico')
WHERE p.access_profile_id IS NULL;

-- ============================================================
-- FASE 7: FUNÇÕES SQL PARA VERIFICAÇÃO DE PERMISSÕES
-- ============================================================

-- Retorna o nome do perfil do usuário
CREATE OR REPLACE FUNCTION public.get_user_profile_name(_user_id UUID)
RETURNS TEXT AS $$
  SELECT ap.name
  FROM public.profiles p
  INNER JOIN public.access_profiles ap ON ap.id = p.access_profile_id
  WHERE p.user_id = _user_id
  LIMIT 1
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verifica se o usuário tem uma ação específica em um módulo
CREATE OR REPLACE FUNCTION public.check_profile_permission(
  _user_id UUID,
  _module  TEXT,
  _action  TEXT  -- 'view', 'consult', 'create', 'edit', 'delete'
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.profile_permissions pp ON pp.profile_id = p.access_profile_id
    WHERE p.user_id = _user_id
    AND pp.module = _module
    AND CASE _action
      WHEN 'view'    THEN pp.can_view
      WHEN 'consult' THEN pp.can_consult
      WHEN 'create'  THEN pp.can_create
      WHEN 'edit'    THEN pp.can_edit
      WHEN 'delete'  THEN pp.can_delete
      ELSE false
    END = true
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verifica se o usuário tem perfil Gerencial
CREATE OR REPLACE FUNCTION public.is_gerencial_user(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.access_profiles ap ON ap.id = p.access_profile_id
    WHERE p.user_id = _user_id
    AND ap.name = 'Gerencial'
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- FASE 8: RLS — NOVAS TABELAS
-- ============================================================

ALTER TABLE public.access_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

-- access_profiles: todos os autenticados podem ler; somente Gerencial pode escrever
CREATE POLICY "Authenticated can view access profiles"
  ON public.access_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gerencial can manage access profiles"
  ON public.access_profiles FOR ALL
  TO authenticated
  USING   (public.is_gerencial_user(auth.uid()))
  WITH CHECK (public.is_gerencial_user(auth.uid()));

-- profile_permissions: todos os autenticados podem ler; somente Gerencial pode escrever
CREATE POLICY "Authenticated can view profile permissions"
  ON public.profile_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gerencial can manage profile permissions"
  ON public.profile_permissions FOR ALL
  TO authenticated
  USING   (public.is_gerencial_user(auth.uid()))
  WITH CHECK (public.is_gerencial_user(auth.uid()));

-- ============================================================
-- FASE 9: ATUALIZAR RLS DE TABELAS FINANCEIRAS
-- Substituir has_role('admin') por check_profile_permission (novo sistema)
-- ============================================================

-- financial_transactions
DROP POLICY IF EXISTS "Admins can manage financial transactions" ON public.financial_transactions;
CREATE POLICY "Finance permission required for financial transactions"
  ON public.financial_transactions FOR ALL
  TO authenticated
  USING   (public.check_profile_permission(auth.uid(), 'finances', 'consult'))
  WITH CHECK (public.check_profile_permission(auth.uid(), 'finances', 'create'));

-- ============================================================
-- FASE 10: TRIGGERS PARA updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS access_profiles_updated_at    ON public.access_profiles;
DROP TRIGGER IF EXISTS profile_permissions_updated_at ON public.profile_permissions;

CREATE TRIGGER access_profiles_updated_at
  BEFORE UPDATE ON public.access_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profile_permissions_updated_at
  BEFORE UPDATE ON public.profile_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
