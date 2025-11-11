-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Criar índice para busca rápida
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Atualizar função para sincronizar email automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', '')
  );
  RETURN NEW;
END;
$$;

-- Popular emails dos usuários existentes
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
AND p.email IS NULL;