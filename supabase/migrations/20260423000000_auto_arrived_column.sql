ALTER TABLE service_call_trips
  ADD COLUMN IF NOT EXISTS auto_arrived BOOLEAN NOT NULL DEFAULT false;
