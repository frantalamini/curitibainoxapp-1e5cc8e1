

## Tres Ajustes na OS

### 1. Campo "Observacao do Recebimento" na aba Financeiro

Adicionar um campo de texto livre (Textarea, 300 caracteres) entre o card de totais (TOTAL OS) e o card de Condicao de Pagamento.

- **Banco de dados**: Criar coluna `receipt_observation` (text, nullable) na tabela `service_calls` via migration
- **FinanceiroTab.tsx**: Adicionar estado local para o campo, carregar do `serviceCall`, exibir Textarea entre os dois cards, salvar junto com os demais dados financeiros
- **useServiceCalls.ts**: Nao precisa alterar (ja usa `*` no select)

### 2. Campo "Defeito Encontrado" na aba Tecnico (obrigatorio)

Adicionar um campo de texto (Textarea, 1000 caracteres) **antes** de "Analises e Providencias Realizadas", com preenchimento obrigatorio.

- **Banco de dados**: Criar coluna `defect_found` (text, nullable) na tabela `service_calls` via migration
- **ServiceCallForm.tsx**:
  - Novo estado `defectFound`
  - Carregar do `existingCall` na inicializacao
  - Renderizar Textarea com label "Defeito Encontrado *" antes do campo "Analises e Providencias Realizadas" (linha ~1773)
  - Incluir no `formattedData` ao salvar
  - Validacao: exibir toast de erro se vazio ao salvar (exceto em modo readonly)

### 3. CNPJ e Inscricao Estadual na aba Geral

Exibir CNPJ e Inscricao Estadual do cliente selecionado como campos somente leitura na aba Geral, logo abaixo do seletor de cliente.

- **useServiceCalls.ts**: Adicionar `cpf_cnpj` e `state_registration` nos dois selects (`SERVICE_CALL_SELECT` e `SERVICE_CALL_SELECT_FULL`) e na interface `clients`
- **ServiceCallForm.tsx**: Apos o `ClientAsyncSelect`, renderizar os campos CNPJ e IE como texto somente leitura (apenas quando houver valor), buscando de `existingCall.clients`

### Detalhes Tecnicos

**Migration SQL:**
```sql
ALTER TABLE service_calls ADD COLUMN receipt_observation text;
ALTER TABLE service_calls ADD COLUMN defect_found text;
```

**Arquivos alterados:**
1. `src/components/os-financeiro/FinanceiroTab.tsx` - Novo campo Textarea "Observacao do Recebimento"
2. `src/pages/ServiceCallForm.tsx` - Campo "Defeito Encontrado" na aba Tecnico + exibicao de CNPJ/IE na aba Geral
3. `src/hooks/useServiceCalls.ts` - Incluir `cpf_cnpj` e `state_registration` nos selects de clients

**Nenhuma parcela ou dado existente sera alterado.**

