
-- Function to handle commercial status changes and auto-manage financial transactions
CREATE OR REPLACE FUNCTION public.handle_commercial_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_is_faturado boolean := false;
  new_is_faturado boolean := false;
BEGIN
  -- Check if OLD commercial_status is "Faturado"
  IF OLD.commercial_status_id IS NOT NULL THEN
    SELECT (lower(name) = 'faturado') INTO old_is_faturado
    FROM service_call_statuses
    WHERE id = OLD.commercial_status_id;
  END IF;

  -- Check if NEW commercial_status is "Faturado"
  IF NEW.commercial_status_id IS NOT NULL THEN
    SELECT (lower(name) = 'faturado') INTO new_is_faturado
    FROM service_call_statuses
    WHERE id = NEW.commercial_status_id;
  END IF;

  -- Only act if commercial_status_id actually changed
  IF OLD.commercial_status_id IS DISTINCT FROM NEW.commercial_status_id THEN
    -- Leaving "Faturado" → cancel OPEN transactions
    IF old_is_faturado AND NOT new_is_faturado THEN
      UPDATE financial_transactions
      SET status = 'CANCELED'
      WHERE service_call_id = NEW.id
        AND status = 'OPEN'
        AND origin = 'SERVICE_CALL';
    END IF;

    -- Entering "Faturado" → reactivate CANCELED transactions
    IF new_is_faturado AND NOT old_is_faturado THEN
      UPDATE financial_transactions
      SET status = 'OPEN'
      WHERE service_call_id = NEW.id
        AND status = 'CANCELED'
        AND origin = 'SERVICE_CALL';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_commercial_status_change ON service_calls;
CREATE TRIGGER trg_commercial_status_change
  BEFORE UPDATE ON service_calls
  FOR EACH ROW
  EXECUTE FUNCTION handle_commercial_status_change();
