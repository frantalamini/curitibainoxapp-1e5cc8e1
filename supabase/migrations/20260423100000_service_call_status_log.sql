-- Tabela de log de alterações de status (técnico e comercial)
CREATE TABLE IF NOT EXISTS service_call_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_call_id UUID NOT NULL REFERENCES service_calls(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_status_id UUID,
  new_status_id UUID,
  old_status_name TEXT,
  new_status_name TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_log_service_call ON service_call_status_log(service_call_id);

ALTER TABLE service_call_status_log ENABLE ROW LEVEL SECURITY;

-- Apenas admin e gerencial podem ver
CREATE POLICY "admin_gerencial_select_status_log" ON service_call_status_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_permissions.user_id = auth.uid()
      AND user_permissions.profile_type IN ('gerencial', 'adm')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Trigger pode inserir (SECURITY DEFINER)
CREATE POLICY "trigger_insert_status_log" ON service_call_status_log
  FOR INSERT WITH CHECK (true);

-- Imutável: ninguém edita ou deleta
-- (sem policies de UPDATE/DELETE = bloqueado por RLS)

-- Função trigger
CREATE OR REPLACE FUNCTION log_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO service_call_status_log (service_call_id, field_changed, old_status_id, new_status_id, old_status_name, new_status_name, changed_by)
    VALUES (
      NEW.id,
      'status_id',
      OLD.status_id,
      NEW.status_id,
      (SELECT name FROM service_call_statuses WHERE id = OLD.status_id),
      (SELECT name FROM service_call_statuses WHERE id = NEW.status_id),
      auth.uid()
    );
  END IF;

  IF OLD.commercial_status_id IS DISTINCT FROM NEW.commercial_status_id THEN
    INSERT INTO service_call_status_log (service_call_id, field_changed, old_status_id, new_status_id, old_status_name, new_status_name, changed_by)
    VALUES (
      NEW.id,
      'commercial_status_id',
      OLD.commercial_status_id,
      NEW.commercial_status_id,
      (SELECT name FROM service_call_statuses WHERE id = OLD.commercial_status_id),
      (SELECT name FROM service_call_statuses WHERE id = NEW.commercial_status_id),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_status_change
  BEFORE UPDATE ON service_calls
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();
