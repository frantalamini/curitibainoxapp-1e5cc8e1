-- Criar enum para tipo de perfil
CREATE TYPE public.profile_type AS ENUM ('gerencial', 'adm', 'tecnico');

-- Criar enum para módulos do sistema
CREATE TYPE public.system_module AS ENUM (
  'service_calls',      -- OS
  'clients',            -- Clientes
  'technicians',        -- Técnicos
  'vehicles',           -- Veículos
  'products',           -- Produtos
  'equipment',          -- Equipamentos
  'schedule',           -- Agenda
  'finances',           -- Finanças
  'settings',           -- Configurações
  'users',              -- Usuários
  'checklists',         -- Checklists
  'service_types',      -- Tipos de Serviço
  'service_statuses',   -- Status de OS
  'payment_methods',    -- Formas de Pagamento
  'reimbursements'      -- Reembolsos
);

-- Tabela de permissões por usuário
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type profile_type NOT NULL DEFAULT 'tecnico',
  module system_module NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Gerencial users can view all permissions"
ON public.user_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.profile_type = 'gerencial'
  )
);

CREATE POLICY "Gerencial users can manage all permissions"
ON public.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
    AND up.profile_type = 'gerencial'
  )
);

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _module system_module,
  _permission TEXT -- 'view', 'edit', 'delete'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
    AND module = _module
    AND (
      -- Gerencial tem tudo
      profile_type = 'gerencial'
      OR
      -- Verificar permissão específica
      CASE _permission
        WHEN 'view' THEN can_view
        WHEN 'edit' THEN can_edit
        WHEN 'delete' THEN can_delete
        ELSE false
      END
    )
  )
$$;

-- Função para obter tipo de perfil do usuário
CREATE OR REPLACE FUNCTION public.get_user_profile_type(_user_id UUID)
RETURNS profile_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT profile_type FROM public.user_permissions WHERE user_id = _user_id LIMIT 1),
    'tecnico'::profile_type
  )
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module);
CREATE INDEX idx_user_permissions_profile_type ON public.user_permissions(profile_type);