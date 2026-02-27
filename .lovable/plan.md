

## Controle Financeiro Automatico por Status Comercial

### Resumo

Implementar a logica onde:
1. **Perfil Gerencial** pode editar OS mesmo apos ser faturada (ADM e Tecnico continuam bloqueados)
2. Ao mudar o status comercial **de "Faturado" para outro** (ex: "Liberado p/ Faturamento"), todas as parcelas financeiras em aberto (OPEN) sao automaticamente **canceladas** (estorno)
3. Ao mudar o status comercial **de volta para "Faturado"**, as parcelas canceladas sao automaticamente **reativadas** (status volta para OPEN)

### Como vai funcionar na pratica

1. Francine (gerencial) abre a OS #1234 que esta "Faturada"
2. Ela ve o botao "Editar" (ADM e tecnicos nao veem)
3. Pelo menu de 3 pontinhos ou pelo formulario, ela muda o status comercial para "Liberado p/ Faturamento"
4. Automaticamente, todas as parcelas financeiras OPEN dessa OS sao marcadas como CANCELED
5. Ela faz as alteracoes necessarias (itens, valores, etc.)
6. Ela muda o status de volta para "Faturado"
7. Automaticamente, as parcelas CANCELED (que tinham origin='SERVICE_CALL') sao restauradas para OPEN

### Detalhes Tecnicos

**1. Trigger no banco de dados** (migration SQL)

Criar uma funcao `handle_commercial_status_change()` que e acionada por um trigger BEFORE UPDATE na tabela `service_calls`, monitorando mudancas na coluna `commercial_status_id`:

- **Saindo de "Faturado"**: Executa `UPDATE financial_transactions SET status = 'CANCELED' WHERE service_call_id = NEW.id AND status = 'OPEN' AND origin = 'SERVICE_CALL'`
- **Entrando em "Faturado"**: Executa `UPDATE financial_transactions SET status = 'OPEN' WHERE service_call_id = NEW.id AND status = 'CANCELED' AND origin = 'SERVICE_CALL'`

Isso garante que independentemente de onde o status mude (formulario, menu rapido, API), o financeiro e atualizado automaticamente.

**2. Permissao do Gerencial na OS Faturada** (`src/pages/ServiceCallForm.tsx`)

- Alterar a logica `isFaturado` para considerar o perfil do usuario
- Se o usuario for **gerencial**, ele pode editar a OS mesmo quando faturada
- ADM e Tecnico continuam bloqueados (comportamento atual mantido)
- O badge "OS Faturada -- Edicao bloqueada" so aparece para ADM/Tecnico

**3. Menu de acoes rapidas** (`src/components/service-calls/ServiceCallActionsMenu.tsx`)

- Permitir que o perfil **gerencial** altere o status comercial mesmo quando a OS esta faturada
- ADM e Tecnico continuam sem ver os submenus de status quando faturado

**4. Invalidacao de cache**

- Apos mudanca de status comercial, invalidar queries de `financial-transactions`, `receivables`, `cash-flow` para que as telas financeiras reflitam o estorno/reativacao imediatamente

### O que NAO muda

- A geracao inicial de parcelas continua sendo manual (admin configura datas, intervalos, formas de pagamento na aba Financeiro)
- Parcelas ja pagas (status PAID) nao sao afetadas pelo estorno automatico -- apenas parcelas em aberto (OPEN) sao canceladas
- Nenhuma parcela e deletada -- apenas o status muda entre OPEN e CANCELED, mantendo o historico completo
- O fluxo de caixa e contas a receber ja filtram por status, entao parcelas CANCELED automaticamente saem dos relatorios

