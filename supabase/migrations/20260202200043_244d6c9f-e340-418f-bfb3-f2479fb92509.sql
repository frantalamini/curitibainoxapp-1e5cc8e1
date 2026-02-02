-- Corrigir link de navegação no trigger de notificação de menção
CREATE OR REPLACE FUNCTION public.create_mention_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_os_number integer;
  v_author_name text;
  v_service_call_id uuid;
BEGIN
  -- Buscar informações da mensagem e OS
  SELECT 
    sc.os_number,
    sc.id,
    COALESCE(p.full_name, 'Alguém')
  INTO v_os_number, v_service_call_id, v_author_name
  FROM service_call_messages msg
  JOIN service_calls sc ON sc.id = msg.service_call_id
  LEFT JOIN profiles p ON p.user_id = msg.author_id
  WHERE msg.id = NEW.message_id;

  -- Criar notificação para o usuário mencionado
  INSERT INTO public.in_app_notifications (
    user_id,
    type,
    title,
    body,
    link,
    metadata
  ) VALUES (
    NEW.mentioned_user_id,
    'mention',
    'Você foi mencionado em uma OS',
    v_author_name || ' mencionou você na OS #' || v_os_number,
    '/service-calls/view/' || v_service_call_id,  -- CORRIGIDO: adicionado /view/
    jsonb_build_object(
      'service_call_id', v_service_call_id,
      'os_number', v_os_number,
      'message_id', NEW.message_id,
      'author_name', v_author_name
    )
  );

  RETURN NEW;
END;
$function$;