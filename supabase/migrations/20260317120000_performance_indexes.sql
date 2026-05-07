-- Índices de performance para as queries mais frequentes
-- Criados com CONCURRENTLY para não bloquear operações em produção

-- service_calls: tabela mais consultada do app
-- scheduled_date: usado em filtros de data em quase todas as queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_calls_scheduled_date
  ON public.service_calls(scheduled_date DESC);

-- status_id: filtrado em openCalls, overdueCalls, todayCalls, etc.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_calls_status_id
  ON public.service_calls(status_id);

-- technician_id: filtrado em relatórios de técnico e agenda
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_calls_technician_id
  ON public.service_calls(technician_id);

-- client_id: usado em joins e filtros de cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_calls_client_id
  ON public.service_calls(client_id);

-- Índice composto para queries de dashboard (status + data juntos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_calls_status_date
  ON public.service_calls(status_id, scheduled_date DESC);

-- financial_transactions: segunda tabela mais consultada (módulo financeiro)
-- status: filtrado em todas as queries de contas a pagar/receber
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_status
  ON public.financial_transactions(status);

-- due_date: filtrado em contas a pagar/receber e dashboard financeiro
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_due_date
  ON public.financial_transactions(due_date DESC);

-- direction: filtrado em todas as queries RECEIVE/PAY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_direction
  ON public.financial_transactions(direction);

-- Índice composto para o padrão mais comum: status + direction + due_date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_status_dir_date
  ON public.financial_transactions(status, direction, due_date DESC);

-- user_roles: consultada em todos os useUserRole calls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

-- technician_reimbursements: consultada nos relatórios de custo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_technician_reimbursements_service_call_id
  ON public.technician_reimbursements(service_call_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_technician_reimbursements_technician_id
  ON public.technician_reimbursements(technician_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_technician_reimbursements_status
  ON public.technician_reimbursements(status);

-- service_call_items: consultada em rentabilidade por OS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_call_items_service_call_id
  ON public.service_call_items(service_call_id);

-- service_call_trips: consultada em custos por técnico e veículo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_call_trips_technician_id
  ON public.service_call_trips(technician_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_call_trips_vehicle_id
  ON public.service_call_trips(vehicle_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_call_trips_started_at
  ON public.service_call_trips(started_at DESC);
