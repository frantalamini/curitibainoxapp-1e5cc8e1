-- Especialidades no colaborador (Refrigeração / Cocção).
-- Trazidas do técnico para o colaborador, já que Colaboradores vira o único
-- cadastro. A tabela technicians continua como engrenagem interna (sincronizada).

ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS specialty_refrigeration BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialty_cooking BOOLEAN NOT NULL DEFAULT false;

-- Copia as especialidades dos técnicos já vinculados para os colaboradores.
UPDATE public.collaborators c
SET specialty_refrigeration = COALESCE(t.specialty_refrigeration, false),
    specialty_cooking = COALESCE(t.specialty_cooking, false)
FROM public.technicians t
WHERE t.collaborator_id = c.id;
