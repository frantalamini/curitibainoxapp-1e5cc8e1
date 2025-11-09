-- Fase 1: Adicionar coluna signatures para histórico
ALTER TABLE service_calls 
ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '[]'::jsonb;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_service_calls_signatures_role 
ON service_calls USING gin(signatures);

-- Migrar dados existentes para o novo formato
UPDATE service_calls
SET signatures = (
  SELECT jsonb_agg(sig)
  FROM (
    -- Assinatura do técnico (se existir)
    SELECT 
      jsonb_build_object(
        'image_url', technician_signature_data,
        'signed_at', COALESCE(technician_signature_date, created_at),
        'signed_by', (SELECT full_name FROM technicians WHERE id = service_calls.technician_id),
        'role', 'tech'
      ) AS sig
    WHERE technician_signature_data IS NOT NULL
    
    UNION ALL
    
    -- Assinatura do cliente (se existir)
    SELECT 
      jsonb_build_object(
        'image_url', customer_signature_data,
        'signed_at', COALESCE(customer_signature_date, created_at),
        'signed_by', customer_name,
        'position', customer_position,
        'role', 'client'
      ) AS sig
    WHERE customer_signature_data IS NOT NULL
  ) sigs
)
WHERE technician_signature_data IS NOT NULL 
   OR customer_signature_data IS NOT NULL;

-- Comentários nos campos deprecated
COMMENT ON COLUMN service_calls.technician_signature_data IS 'DEPRECATED: Use signatures array';
COMMENT ON COLUMN service_calls.technician_signature_url IS 'DEPRECATED: Use signatures array';
COMMENT ON COLUMN service_calls.technician_signature_date IS 'DEPRECATED: Use signatures array';
COMMENT ON COLUMN service_calls.customer_signature_data IS 'DEPRECATED: Use signatures array';
COMMENT ON COLUMN service_calls.customer_signature_url IS 'DEPRECATED: Use signatures array';
COMMENT ON COLUMN service_calls.customer_signature_date IS 'DEPRECATED: Use signatures array';