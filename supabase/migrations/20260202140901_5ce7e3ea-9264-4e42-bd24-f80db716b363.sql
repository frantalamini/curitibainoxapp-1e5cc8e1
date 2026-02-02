-- Create audit log table for financial transactions
CREATE TABLE public.financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL DEFAULT 'financial_transactions',
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (and cannot delete/modify them)
CREATE POLICY "Admins can view audit logs"
  ON public.financial_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No one can delete or update audit logs (immutable)
-- INSERT is done via trigger (SECURITY DEFINER)

-- Create trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_financial_transaction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed text[];
  old_json jsonb;
  new_json jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_log (record_id, action, old_data, user_id)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    -- Get list of changed fields
    SELECT array_agg(key) INTO changed
    FROM jsonb_each(new_json) n
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_each(old_json) o 
      WHERE o.key = n.key AND o.value = n.value
    );
    
    INSERT INTO public.financial_audit_log (record_id, action, old_data, new_data, changed_fields, user_id)
    VALUES (NEW.id, 'UPDATE', old_json, new_json, changed, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_log (record_id, action, new_data, user_id)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on financial_transactions
CREATE TRIGGER audit_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_financial_transaction_changes();

-- Add index for faster queries
CREATE INDEX idx_financial_audit_log_record_id ON public.financial_audit_log(record_id);
CREATE INDEX idx_financial_audit_log_created_at ON public.financial_audit_log(created_at DESC);