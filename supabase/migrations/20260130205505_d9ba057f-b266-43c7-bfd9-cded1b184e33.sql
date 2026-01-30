-- Add file_path column to store the path within the bucket
ALTER TABLE public.service_call_message_attachments 
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Backfill existing records: extract path from file_url
-- Pattern: .../object/public/chat-attachments/<path>
UPDATE public.service_call_message_attachments
SET file_path = regexp_replace(file_url, '^.*/object/public/chat-attachments/', '')
WHERE file_path IS NULL
  AND file_url LIKE '%/object/public/chat-attachments/%';