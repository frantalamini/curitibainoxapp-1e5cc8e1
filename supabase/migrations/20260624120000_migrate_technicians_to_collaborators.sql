-- Migração única: transforma os técnicos existentes em colaboradores e vincula.
-- Roda depois de 20260624110000 (cria collaborators + technicians.collaborator_id).
-- Cada técnico ainda não vinculado vira um colaborador "Técnico" CLT que atende OS.
-- O custo/hora detalhado (salário, encargos) deve ser completado depois no cadastro.

INSERT INTO public.collaborators (
  full_name, phone, role_title, employment_type, attends_os,
  base_salary, monthly_hours, cost_per_hour, active
)
SELECT
  t.full_name,
  t.phone,
  'Técnico',
  'clt'::public.employment_type,
  true,
  0,
  220,
  COALESCE(t.cost_per_hour, 0),
  t.active
FROM public.technicians t
WHERE t.collaborator_id IS NULL;

-- Vincula cada técnico ao colaborador correspondente (match por nome).
UPDATE public.technicians t
SET collaborator_id = c.id
FROM public.collaborators c
WHERE t.collaborator_id IS NULL
  AND c.full_name = t.full_name
  AND c.role_title = 'Técnico';
