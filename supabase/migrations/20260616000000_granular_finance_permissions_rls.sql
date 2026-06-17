-- ============================================================================
-- Permissões granulares de Finanças + RLS data-driven
-- ----------------------------------------------------------------------------
-- Objetivo: fazer com que as permissões configuradas no front-end (matriz de
-- perfis) reflitam de fato na camada de dados, com granularidade por módulo.
--
-- Modelo PRAGMÁTICO (decidido com o cliente):
--   * Tabelas financeiras COMPARTILHADAS entre várias telas (financial_transactions,
--     financial_accounts, audit) → leitura/escrita liberada por QUALQUER permissão
--     de finanças (umbrella 'finances' satisfeita por qualquer 'financas_*').
--   * Tabelas 1:1 (cartões, centro de custo, orçamento, recorrentes, categorias)
--     → escrita exige o módulo granular específico; leitura segue o umbrella.
--   * A UI já restringe quais telas cada perfil enxerga (granularidade total).
--
-- Idempotente e transacional. Não remove dados; apenas policies/funções.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Helper: módulo-pai (umbrella) de um módulo granular
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.module_parent(_module text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _module LIKE 'financas\_%' ESCAPE '\' THEN 'finances'
    WHEN _module LIKE 'compras\_%'  ESCAPE '\' THEN 'compras'
    WHEN _module = 'vendas_entregas'           THEN 'vendas'
    ELSE NULL
  END
$$;

-- ----------------------------------------------------------------------------
-- 1. Reescrita de check_profile_permission
--    Regras (em OR):
--      a) Gerencial sempre TRUE
--      b) Permissão direta no próprio módulo
--      c) Herança do módulo-pai (ter no pai concede a todos os filhos)
--      d) PRAGMÁTICO: pedir a ação no umbrella 'finances' é satisfeito por
--         QUALQUER 'financas_*' que tenha a mesma ação (telas compartilham tabela)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_profile_permission(
  _user_id uuid,
  _module  text,
  _action  text  -- 'view' | 'consult' | 'create' | 'edit' | 'delete'
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- (a) Gerencial tem acesso total
    public.is_gerencial_user(_user_id)

    -- (b) Permissão direta no módulo
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profile_permissions pp ON pp.profile_id = p.access_profile_id
      WHERE p.user_id = _user_id
        AND pp.module = _module
        AND CASE _action
              WHEN 'view'    THEN pp.can_view
              WHEN 'consult' THEN pp.can_consult
              WHEN 'create'  THEN pp.can_create
              WHEN 'edit'    THEN pp.can_edit
              WHEN 'delete'  THEN pp.can_delete
              ELSE false
            END
    )

    -- (c) Herança do módulo-pai (umbrella → filhos)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.profile_permissions pp ON pp.profile_id = p.access_profile_id
      WHERE p.user_id = _user_id
        AND pp.module = public.module_parent(_module)
        AND CASE _action
              WHEN 'view'    THEN pp.can_view
              WHEN 'consult' THEN pp.can_consult
              WHEN 'create'  THEN pp.can_create
              WHEN 'edit'    THEN pp.can_edit
              WHEN 'delete'  THEN pp.can_delete
              ELSE false
            END
    )

    -- (d) Pragmático: a ação no umbrella 'finances' é concedida se o usuário
    --     tem a mesma ação em QUALQUER módulo financeiro granular OU na aba
    --     financeira da OS (os_aba_financeiro), que manipula transações.
    OR (
      _module = 'finances'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.profile_permissions pp ON pp.profile_id = p.access_profile_id
        WHERE p.user_id = _user_id
          AND (pp.module LIKE 'financas\_%' ESCAPE '\'
               OR pp.module = 'os_aba_financeiro')
          AND CASE _action
                WHEN 'view'    THEN pp.can_view
                WHEN 'consult' THEN pp.can_consult
                WHEN 'create'  THEN pp.can_create
                WHEN 'edit'    THEN pp.can_edit
                WHEN 'delete'  THEN pp.can_delete
                ELSE false
              END
      )
    )
$$;

-- ----------------------------------------------------------------------------
-- 2. Semear módulos novos em profile_permissions (todos os perfis), default OFF
--    Preserva idempotência: ON CONFLICT DO NOTHING.
-- ----------------------------------------------------------------------------
INSERT INTO public.profile_permissions
  (profile_id, module, can_view, can_consult, can_create, can_edit, can_delete)
SELECT ap.id, m.module, false, false, false, false, false
FROM public.access_profiles ap
CROSS JOIN (VALUES
  ('qrcode'), ('service_notes'), ('vendas'), ('vendas_entregas'),
  ('financas_contas_pagar'), ('financas_contas_receber'), ('financas_cartoes'),
  ('financas_fluxo'), ('financas_dre'), ('financas_rentabilidade'),
  ('financas_centro_custo'), ('financas_custos_tecnico'), ('financas_custos_veiculo'),
  ('financas_conciliacao'), ('financas_orcamento'), ('financas_recorrentes'),
  ('financas_config')
) AS m(module)
ON CONFLICT (profile_id, module) DO NOTHING;

-- 2a. Gerencial: tudo TRUE (já tem short-circuit, mas mantém a matriz coerente)
UPDATE public.profile_permissions pp
SET can_view = true, can_consult = true, can_create = true, can_edit = true, can_delete = true
FROM public.access_profiles ap
WHERE pp.profile_id = ap.id AND ap.name = 'Gerencial';

-- 2b. QR Code e Notas de Serviço eram visíveis a TODOS os perfis antes (sem gate
--     no menu). Preserva a visibilidade para todos os perfis não-Gerencial.
UPDATE public.profile_permissions pp
SET can_view = true, can_consult = true
FROM public.access_profiles ap
WHERE pp.profile_id = ap.id AND ap.name <> 'Gerencial'
  AND pp.module IN ('qrcode', 'service_notes');

-- 2c. Vendas/Entregas eram visíveis a Gerencial + Administrativo (via isAdmin).
--     Preserva para Administrativo (Gerencial já tem tudo via 2a).
UPDATE public.profile_permissions pp
SET can_view = true, can_consult = true, can_create = true, can_edit = true
FROM public.access_profiles ap
WHERE pp.profile_id = ap.id AND ap.name = 'Administrativo'
  AND pp.module IN ('vendas', 'vendas_entregas');

-- ----------------------------------------------------------------------------
-- 3. RLS das tabelas financeiras (legado has_role → matriz check_profile_permission)
--    Padrão por tabela: limpa todas as policies existentes e recria 4 (SELECT,
--    INSERT, UPDATE, DELETE). Leitura sempre pelo umbrella 'finances' (pragmático);
--    escrita pelo módulo granular informado.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec  record;
  pol  record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('financial_transactions',  'finances'),
      ('financial_accounts',      'finances'),
      ('financial_categories',    'financas_config'),
      ('cost_centers',            'financas_centro_custo'),
      ('credit_cards',            'financas_cartoes'),
      ('category_budgets',        'financas_orcamento'),
      ('recurring_transactions',  'financas_recorrentes')
    ) AS t(tbl, wmod)
  LOOP
    -- limpa todas as policies atuais da tabela (remove has_role legado)
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = rec.tbl
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, rec.tbl);
    END LOOP;

    -- Defensivo: garante RLS habilitado (não vaza se alguém deu DISABLE manual)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tbl);

    EXECUTE format($f$
      CREATE POLICY "fin_select_%1$s" ON public.%1$s
        FOR SELECT TO authenticated
        USING (public.check_profile_permission(auth.uid(), 'finances', 'consult'));
    $f$, rec.tbl);

    EXECUTE format($f$
      CREATE POLICY "fin_insert_%1$s" ON public.%1$s
        FOR INSERT TO authenticated
        WITH CHECK (public.check_profile_permission(auth.uid(), %2$L, 'create'));
    $f$, rec.tbl, rec.wmod);

    EXECUTE format($f$
      CREATE POLICY "fin_update_%1$s" ON public.%1$s
        FOR UPDATE TO authenticated
        USING (public.check_profile_permission(auth.uid(), %2$L, 'edit'))
        WITH CHECK (public.check_profile_permission(auth.uid(), %2$L, 'edit'));
    $f$, rec.tbl, rec.wmod);

    EXECUTE format($f$
      CREATE POLICY "fin_delete_%1$s" ON public.%1$s
        FOR DELETE TO authenticated
        USING (public.check_profile_permission(auth.uid(), %2$L, 'delete'));
    $f$, rec.tbl, rec.wmod);
  END LOOP;
END$$;

-- 3a. financial_audit_log: LEITURA restrita a finanças; ESCRITA mantida aberta.
--     Verificado na VPS: NÃO existe trigger gravando esta tabela e o front-end
--     não a escreve direto. Hoje está 'authenticated_all' (qualquer um lê/escreve)
--     — isso é um vazamento. Restringimos a LEITURA a quem tem finanças, mas
--     mantemos o INSERT aberto (append-only) para não quebrar o gravador atual
--     (service_role/edge function, que bypassa RLS de qualquer forma).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'financial_audit_log'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.financial_audit_log', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_finance" ON public.financial_audit_log
  FOR SELECT TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'finances', 'consult'));

CREATE POLICY "audit_insert_authenticated" ON public.financial_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3b. payment_methods (cadastro): leitura aberta de ativos; escrita pelo módulo
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payment_methods'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.payment_methods', pol.policyname);
  END LOOP;
END$$;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select_active" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND active = true);

CREATE POLICY "pm_insert" ON public.payment_methods
  FOR INSERT TO authenticated
  WITH CHECK (public.check_profile_permission(auth.uid(), 'payment_methods', 'create'));

CREATE POLICY "pm_update" ON public.payment_methods
  FOR UPDATE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'payment_methods', 'edit'))
  WITH CHECK (public.check_profile_permission(auth.uid(), 'payment_methods', 'edit'));

CREATE POLICY "pm_delete" ON public.payment_methods
  FOR DELETE TO authenticated
  USING (public.check_profile_permission(auth.uid(), 'payment_methods', 'delete'));

-- 3c. sales / sale_items: módulo 'vendas'
DO $$
DECLARE
  rec record;
  pol record;
BEGIN
  FOR rec IN SELECT unnest(ARRAY['sales','sale_items']) AS tbl
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = rec.tbl
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, rec.tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tbl);

    EXECUTE format($f$
      CREATE POLICY "vendas_select_%1$s" ON public.%1$s
        FOR SELECT TO authenticated
        USING (public.check_profile_permission(auth.uid(), 'vendas', 'consult'));
    $f$, rec.tbl);
    EXECUTE format($f$
      CREATE POLICY "vendas_insert_%1$s" ON public.%1$s
        FOR INSERT TO authenticated
        WITH CHECK (public.check_profile_permission(auth.uid(), 'vendas', 'create'));
    $f$, rec.tbl);
    EXECUTE format($f$
      CREATE POLICY "vendas_update_%1$s" ON public.%1$s
        FOR UPDATE TO authenticated
        USING (public.check_profile_permission(auth.uid(), 'vendas', 'edit'))
        WITH CHECK (public.check_profile_permission(auth.uid(), 'vendas', 'edit'));
    $f$, rec.tbl);
    EXECUTE format($f$
      CREATE POLICY "vendas_delete_%1$s" ON public.%1$s
        FOR DELETE TO authenticated
        USING (public.check_profile_permission(auth.uid(), 'vendas', 'delete'));
    $f$, rec.tbl);
  END LOOP;
END$$;

COMMIT;

-- ============================================================================
-- NÃO ALTERADO de propósito (avaliar em sprint futuro):
--   * service_call_items  → permanece admin-only (valores da OS já ocultos a
--                            não-admins; mudar exige cuidado p/ não vazar valores).
--   * technician_reimbursements → mantém lógica própria (técnico vê os seus).
--   * products            → fora do escopo de finanças.
-- ============================================================================
