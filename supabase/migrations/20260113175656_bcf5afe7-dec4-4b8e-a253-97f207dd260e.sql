-- Recriar view com SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS product_stock_balance;

CREATE VIEW product_stock_balance 
WITH (security_invoker = true) AS
SELECT 
  product_id,
  COALESCE(SUM(
    CASE 
      WHEN type = 'IN' THEN qty 
      WHEN type = 'OUT' THEN -qty 
      WHEN type = 'ADJUST' THEN qty
      ELSE 0 
    END
  ), 0) as balance
FROM stock_movements
GROUP BY product_id;