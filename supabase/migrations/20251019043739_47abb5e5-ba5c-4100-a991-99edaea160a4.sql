-- Criar tabela de checklists
CREATE TABLE IF NOT EXISTS checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies para checklists
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklists"
ON checklists FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Technicians can view checklists"
ON checklists FOR SELECT
USING (has_role(auth.uid(), 'technician'::app_role));

-- Adicionar trigger de updated_at para checklists
CREATE TRIGGER update_checklists_updated_at
BEFORE UPDATE ON checklists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Adicionar novos campos na tabela service_calls
ALTER TABLE service_calls 
ADD COLUMN IF NOT EXISTS technical_diagnosis TEXT,
ADD COLUMN IF NOT EXISTS technical_diagnosis_audio_url TEXT,
ADD COLUMN IF NOT EXISTS photos_before_urls TEXT[],
ADD COLUMN IF NOT EXISTS video_before_url TEXT,
ADD COLUMN IF NOT EXISTS photos_after_urls TEXT[],
ADD COLUMN IF NOT EXISTS video_after_url TEXT,
ADD COLUMN IF NOT EXISTS checklist_id UUID REFERENCES checklists(id),
ADD COLUMN IF NOT EXISTS checklist_responses JSONB,
ADD COLUMN IF NOT EXISTS technician_signature_url TEXT,
ADD COLUMN IF NOT EXISTS technician_signature_data TEXT,
ADD COLUMN IF NOT EXISTS technician_signature_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_signature_url TEXT,
ADD COLUMN IF NOT EXISTS customer_signature_data TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_position TEXT,
ADD COLUMN IF NOT EXISTS customer_signature_date TIMESTAMPTZ;