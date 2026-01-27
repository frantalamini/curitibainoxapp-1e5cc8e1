-- Fix: Enable RLS on product_stock_balance view
-- This view exposes inventory levels which could give competitors business intelligence

-- First, we need to check if RLS is enabled on the underlying products and stock_movements tables
-- The view is defined as: SELECT product_id, sum(qty) as balance FROM stock_movements GROUP BY product_id

-- Since product_stock_balance is a VIEW (not a table), we can't enable RLS directly on it
-- Instead, we need to create a secure view with security_invoker

-- Drop the existing view
DROP VIEW IF EXISTS public.product_stock_balance;

-- Recreate as a security invoker view (inherits RLS from underlying tables)
CREATE VIEW public.product_stock_balance
WITH (security_invoker = on) AS
SELECT 
  product_id,
  SUM(
    CASE 
      WHEN type = 'IN' THEN qty
      WHEN type = 'OUT' THEN -qty
      WHEN type = 'ADJUST' THEN qty
      ELSE 0
    END
  ) as balance
FROM public.stock_movements
GROUP BY product_id;