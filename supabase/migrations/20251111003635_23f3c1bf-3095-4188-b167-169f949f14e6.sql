-- Migração para adicionar usernames aos usuários existentes que não possuem
-- Gera username baseado no primeiro nome e sobrenome (lowercase, sem espaços e caracteres especiais)

DO $$
DECLARE
  profile_record RECORD;
  generated_username TEXT;
  username_counter INTEGER;
  final_username TEXT;
BEGIN
  -- Iterar por todos os perfis sem username
  FOR profile_record IN 
    SELECT id, user_id, full_name 
    FROM public.profiles 
    WHERE username IS NULL OR username = ''
  LOOP
    -- Gerar username base a partir do nome completo
    -- Remove caracteres especiais, converte para lowercase, pega apenas primeiras duas palavras
    generated_username := lower(
      regexp_replace(
        split_part(profile_record.full_name, ' ', 1) || 
        split_part(profile_record.full_name, ' ', 2),
        '[^a-z0-9]', '', 'g'
      )
    );
    
    -- Substituir acentos manualmente (caracteres mais comuns)
    generated_username := translate(generated_username, 
      'áàâãäéèêëíìîïóòôõöúùûüçñ', 
      'aaaaaeeeeiiiiooooouuuucn'
    );
    
    -- Garantir que tem pelo menos 3 caracteres
    IF length(generated_username) < 3 THEN
      generated_username := generated_username || 'user';
    END IF;
    
    -- Limitar a 20 caracteres
    generated_username := substring(generated_username from 1 for 20);
    
    -- Verificar se username já existe e adicionar número se necessário
    final_username := generated_username;
    username_counter := 1;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
      final_username := substring(generated_username from 1 for 15) || username_counter::TEXT;
      username_counter := username_counter + 1;
    END LOOP;
    
    -- Atualizar o perfil com o username gerado
    UPDATE public.profiles 
    SET username = final_username 
    WHERE id = profile_record.id;
    
    RAISE NOTICE 'Username gerado para %: %', profile_record.full_name, final_username;
  END LOOP;
END $$;