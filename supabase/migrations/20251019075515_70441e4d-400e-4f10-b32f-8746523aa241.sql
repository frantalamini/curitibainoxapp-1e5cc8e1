-- Ajusta a sequence para o próximo valor após o maior os_number existente
SELECT setval('service_calls_os_number_seq', (SELECT COALESCE(MAX(os_number), 0) FROM service_calls), true);