ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS document_number text;
