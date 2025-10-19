-- Add started_at column to track when technician starts the task
ALTER TABLE public.service_calls 
ADD COLUMN started_at timestamp with time zone;

COMMENT ON COLUMN public.service_calls.started_at 
IS 'Timestamp de quando o técnico iniciou a execução da tarefa';