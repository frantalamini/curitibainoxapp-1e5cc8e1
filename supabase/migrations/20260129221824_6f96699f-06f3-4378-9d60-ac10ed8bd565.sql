-- Remover políticas que causam recursão infinita
DROP POLICY IF EXISTS "Gerencial users can manage all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Gerencial users can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;

-- Criar novas políticas usando a função SECURITY DEFINER (não causa recursão)
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Gerencial users can view all permissions"
ON public.user_permissions
FOR SELECT
USING (get_user_profile_type(auth.uid()) = 'gerencial');

CREATE POLICY "Gerencial users can insert permissions"
ON public.user_permissions
FOR INSERT
WITH CHECK (get_user_profile_type(auth.uid()) = 'gerencial');

CREATE POLICY "Gerencial users can update permissions"
ON public.user_permissions
FOR UPDATE
USING (get_user_profile_type(auth.uid()) = 'gerencial');

CREATE POLICY "Gerencial users can delete permissions"
ON public.user_permissions
FOR DELETE
USING (get_user_profile_type(auth.uid()) = 'gerencial');