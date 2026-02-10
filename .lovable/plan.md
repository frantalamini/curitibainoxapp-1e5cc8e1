

## Melhorias na Gestao de Reembolso Tecnico

Apos analisar o sistema atual, identifiquei o seguinte cenario e as melhorias necessarias:

### Situacao Atual

- A pagina de reembolsos ja existe em `/technician-reimbursements` (menu lateral: "Reembolso Tecnico")
- Como Gerencial/admin, voce ja ve todos os reembolsos nessa pagina
- Dentro de cada OS, a aba "Custos Operacionais" tambem mostra os reembolsos daquela OS
- **Porem**: nao ha um painel resumo (dashboard) com totais pendentes na pagina principal de reembolsos
- **Porem**: ao anexar comprovante de pagamento, o sistema NAO usa OCR para confirmar automaticamente
- **Porem**: reembolsos aprovados NAO geram lancamentos em "Contas a Pagar"

---

### O que sera feito

**1. Dashboard de Pendencias Financeiras na pagina de Reembolsos**

Adicionar cards de resumo no topo da pagina `/technician-reimbursements` mostrando:
- Total Pendente (aguardando aprovacao)
- Total Aprovado (aguardando pagamento)
- Total Pago
- Filtros por status para facilitar a gestao

**2. OCR no Comprovante de Pagamento**

Quando voce anexar o comprovante de pagamento ao dar baixa no reembolso, o sistema usara OCR (mesma funcao `extract-receipt-amount`) para ler o valor do comprovante automaticamente. Se o valor lido bater com o valor do reembolso, a baixa sera confirmada automaticamente. Se divergir, mostrara um alerta para voce decidir.

**3. Gerar Contas a Pagar ao Aprovar Reembolso**

Quando um reembolso for aprovado, o sistema criara automaticamente um lancamento em `financial_transactions` com:
- `direction = 'PAY'` (Conta a Pagar)
- `origin = 'MANUAL'`
- `status = 'OPEN'`
- Valor e descricao do reembolso
- Vinculo a OS original

Quando o reembolso for marcado como pago, o lancamento correspondente tambem sera baixado automaticamente.

---

### Detalhes Tecnicos

**Arquivos modificados:**

1. **`src/pages/TechnicianReimbursements.tsx`**
   - Adicionar cards de resumo (Pendente / Aprovado / Pago) no topo usando os dados de `summary` que o hook ja retorna
   - Adicionar filtro por status (Todos / Pendente / Aprovado / Pago / Rejeitado)

2. **`src/components/os-financeiro/OperationalCostsTab.tsx`**
   - No dialog de "Confirmar Pagamento", apos upload do comprovante, chamar a Edge Function `extract-receipt-amount` para ler o valor via OCR
   - Exibir o valor lido e comparar com o valor do reembolso antes de confirmar

3. **`src/components/reimbursements/ReimbursementDetailsDialog.tsx`**
   - Adicionar botoes de acao para admin (Aprovar / Rejeitar / Baixar) diretamente no dialog de detalhes
   - Adicionar funcionalidade de anexar comprovante de pagamento com OCR

4. **`src/hooks/useTechnicianReimbursements.ts`**
   - Na mutacao `approveReimbursement`: apos aprovar, criar automaticamente um registro em `financial_transactions` (direction='PAY', status='OPEN')
   - Na mutacao `markAsPaid`: apos marcar como pago, atualizar o `financial_transaction` correspondente para status='PAID'

**Nenhum outro modulo ou funcionalidade sera alterado.**

