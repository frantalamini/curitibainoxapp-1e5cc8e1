-- Drop the public read policy that was created in migration 20251019041456
-- This is a no-op if it was already dropped
DROP POLICY IF EXISTS "Public read access to service call attachments" ON storage.objects;