-- Add agency, account_number and manager fields to financial_accounts table
ALTER TABLE public.financial_accounts
ADD COLUMN agency VARCHAR(20) NULL,
ADD COLUMN account_number VARCHAR(30) NULL,
ADD COLUMN manager_name VARCHAR(100) NULL;