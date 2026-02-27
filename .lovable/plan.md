

## Alterar nome do arquivo PDF para incluir nome do cliente

### O que muda
O nome do arquivo ao salvar o PDF passara de `OS-2832.pdf` para `Coritiba - OS2832.pdf`, usando o nome fantasia (primeiros dois nomes) ou o primeiro nome do cliente.

### Logica do nome
1. Se o cliente tem `nome_fantasia`, pegar apenas as duas primeiras palavras (ex: "Coritiba Inox Ltda" -> "Coritiba Inox")
2. Senao, pegar apenas o primeiro nome de `full_name` (ex: "Joao Carlos Silva" -> "Joao")
3. Formato final: `{NomeCliente} - OS{numero}.pdf`

### Alteracao tecnica

**Arquivo: `src/pages/ServiceCallForm.tsx`**
- Criar uma funcao helper local que gera o nome do arquivo a partir de `existingCall.clients` e `existingCall.os_number`
- Substituir as duas ocorrencias de `` `OS-${existingCall.os_number}.pdf` `` (linhas 2252 e 2268) pelo resultado dessa funcao

