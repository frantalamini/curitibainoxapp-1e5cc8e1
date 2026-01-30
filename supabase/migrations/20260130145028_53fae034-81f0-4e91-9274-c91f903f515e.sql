-- Tabela para armazenar marcadores de lembretes nas OS
CREATE TABLE public.service_call_markers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_call_id uuid NOT NULL REFERENCES public.service_calls(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Índice para buscar marcadores por OS
CREATE INDEX idx_service_call_markers_service_call_id ON public.service_call_markers(service_call_id);

-- Habilitar RLS
ALTER TABLE public.service_call_markers ENABLE ROW LEVEL SECURITY;

-- Admins e técnicos podem visualizar marcadores das OS que têm acesso
CREATE POLICY "Users can view markers of accessible service calls"
ON public.service_call_markers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_calls sc
    WHERE sc.id = service_call_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'technician'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.technicians t
          WHERE t.id = sc.technician_id AND t.user_id = auth.uid()
        )
      )
    )
  )
);

-- Admins e técnicos podem inserir marcadores
CREATE POLICY "Admins and technicians can insert markers"
ON public.service_call_markers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role)
);

-- Admins e técnicos podem deletar marcadores (os seus ou todos se admin)
CREATE POLICY "Users can delete markers"
ON public.service_call_markers
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'technician'::app_role) AND created_by = auth.uid())
);