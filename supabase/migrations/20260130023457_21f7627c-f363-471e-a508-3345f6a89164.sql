-- Add reconciliation fields to financial_transactions
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS is_reconciled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS bank_statement_ref text;

-- Add index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reconciled 
ON public.financial_transactions(is_reconciled, financial_account_id);

COMMENT ON COLUMN public.financial_transactions.is_reconciled IS 'Whether this transaction has been reconciled with bank statement';
COMMENT ON COLUMN public.financial_transactions.reconciled_at IS 'When the transaction was reconciled';
COMMENT ON COLUMN public.financial_transactions.bank_statement_ref IS 'Reference from bank statement (e.g., transaction ID from OFX)';