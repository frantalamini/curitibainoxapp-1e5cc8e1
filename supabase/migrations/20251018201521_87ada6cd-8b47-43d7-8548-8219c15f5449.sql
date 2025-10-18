-- Criar sequência para technician_number
CREATE SEQUENCE IF NOT EXISTS technicians_number_seq START 1;

-- Adicionar novas colunas
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS technician_number INTEGER UNIQUE DEFAULT nextval('technicians_number_seq'),
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialty_refrigeration BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialty_cooking BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Adicionar constraint de tamanho para additional_notes
ALTER TABLE public.technicians
  ADD CONSTRAINT additional_notes_length CHECK (char_length(additional_notes) <= 300);

-- Remover colunas antigas
ALTER TABLE public.technicians
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS specialties;

-- Remover política de DELETE (impedir exclusões)
DROP POLICY IF EXISTS "Only admins can delete technicians" ON public.technicians;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Only admins can insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Only admins can update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Everyone can view active technicians" ON public.technicians;

-- Criar novas políticas RLS
CREATE POLICY "Admins can insert technicians"
ON public.technicians FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update technicians"
ON public.technicians FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active technicians"
ON public.technicians FOR SELECT
TO authenticated
USING (active = true OR has_role(auth.uid(), 'admin'::app_role));