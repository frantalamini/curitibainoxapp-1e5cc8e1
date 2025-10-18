-- Create enum for service call urgency
CREATE TYPE public.service_urgency AS ENUM ('corrective', 'preventive');

-- Create enum for service call status
CREATE TYPE public.service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create service_calls table
CREATE TABLE public.service_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  equipment_description TEXT NOT NULL,
  urgency service_urgency NOT NULL,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status service_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and technicians can view all service calls"
ON public.service_calls
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Admins and technicians can insert service calls"
ON public.service_calls
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Admins and technicians can update service calls"
ON public.service_calls
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'technician'::app_role));

CREATE POLICY "Only admins can delete service calls"
ON public.service_calls
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_service_calls_updated_at
BEFORE UPDATE ON public.service_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();