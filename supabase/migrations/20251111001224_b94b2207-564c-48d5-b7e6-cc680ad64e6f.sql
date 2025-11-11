-- Adicionar campo username na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Criar índice único para username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Adicionar constraint para formato do username (apenas letras, números, underscore, ponto)
ALTER TABLE public.profiles ADD CONSTRAINT username_format 
  CHECK (username ~* '^[a-zA-Z0-9_.]+$');