-- Add access token column to service_calls for secure public report access
ALTER TABLE public.service_calls
ADD COLUMN report_access_token UUID DEFAULT gen_random_uuid();

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_service_calls_report_access_token
ON public.service_calls (report_access_token);

-- Populate existing rows with unique tokens
UPDATE public.service_calls
SET report_access_token = gen_random_uuid()
WHERE report_access_token IS NULL;