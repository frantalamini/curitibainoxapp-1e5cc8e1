
-- Reordenar status comerciais conforme solicitado:
-- Aguardando Aprovação=1, Cancelado=2, Aprovado=3, Liberado P/ Faturamento=4, Faturado=5
UPDATE service_call_statuses SET display_order = 1 WHERE id = 'eb424e49-a7d5-47ee-9f86-de19765a42bd'; -- Aguardando aprovação
UPDATE service_call_statuses SET display_order = 2 WHERE id = '7f8719b6-1e53-4fdd-b3ad-506c0a24dbbf'; -- Cancelado
UPDATE service_call_statuses SET display_order = 3 WHERE id = '92fb6acc-f2bf-4b5e-8886-f10f52687f35'; -- Aprovado
UPDATE service_call_statuses SET display_order = 4 WHERE id = 'd371da75-96c9-4afd-9167-5ec9a613ad97'; -- Liberado P/ Faturamento
UPDATE service_call_statuses SET display_order = 5 WHERE id = '214841a9-3217-4413-9db1-c106a61c0240'; -- Faturado
