-- Create storage bucket for service call attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-call-attachments', 'service-call-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for service call attachments
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'service-call-attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'service-call-attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'service-call-attachments' AND
  auth.role() = 'authenticated'
);

-- Add new columns to service_calls table for attachments
ALTER TABLE public.service_calls
ADD COLUMN IF NOT EXISTS problem_description text,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS media_urls text[];