

## Mover CNPJ e Inscricao Estadual para dentro do card do cliente

O CNPJ e a Inscricao Estadual estao aparecendo como um bloco separado abaixo do seletor de cliente. O ajuste e mover essas informacoes para dentro do card cinza que ja exibe razao social, telefone e endereco do cliente selecionado.

### Alteracoes

**Arquivo: `src/components/ClientAsyncSelect.tsx`**
- No card de cliente selecionado (bloco `bg-muted`), adicionar logo abaixo do nome (`full_name`):
  - Linha com CNPJ/CPF (se existir): `CPF/CNPJ: XX.XXX.XXX/XXXX-XX`
  - Linha com Inscricao Estadual (se existir): `IE: XXXXXXX`
- O `selectedClient` ja traz todos os campos da tabela `clients`, incluindo `cpf_cnpj` e `state_registration`, pois a query usa `select('*')`

**Arquivo: `src/pages/ServiceCallForm.tsx`**
- Remover o bloco separado de CNPJ/IE (linhas 1282-1298) que foi adicionado anteriormente, ja que agora essas informacoes aparecerao automaticamente dentro do componente `ClientAsyncSelect`

### Resultado visual esperado

O card cinza do cliente ficara assim:
```text
Razao Social do Cliente
CPF/CNPJ: 10.174.421/0001-92
IE: 12345678
Telefone: (41) 99999-9999
Rua Exemplo, 123 - Curitiba
```

Nenhuma alteracao no banco de dados. Apenas movimentacao de informacao no layout.

