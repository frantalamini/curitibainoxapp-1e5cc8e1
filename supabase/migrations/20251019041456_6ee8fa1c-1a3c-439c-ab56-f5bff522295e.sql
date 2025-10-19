-- Garantir que o bucket service-call-attachments é público para leitura
UPDATE storage.buckets 
SET public = true 
WHERE id = 'service-call-attachments';

-- Adicionar políticas de RLS para permitir leitura pública dos arquivos
DROP POLICY IF EXISTS "Public read access to service call attachments" ON storage.objects;
CREATE POLICY "Public read access to service call attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'service-call-attachments');

-- Manter as políticas de upload apenas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'service-call-attachments' 
  AND auth.role() = 'authenticated'
);