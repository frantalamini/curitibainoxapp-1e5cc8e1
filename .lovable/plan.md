

## Ajustes na Aba Financeiro da OS

### 1. Campo de Observacao com 300 caracteres

O campo "Obs" na tabela de parcelas ja existe, mas atualmente esta limitado a 100 caracteres. A alteracao e simples:

**Arquivo:** `src/components/os-financeiro/FinanceiroTab.tsx`
- Alterar o `maxLength` de `100` para `300` nos dois inputs de observacao (modo edicao inline e modo direto)
- O campo no banco de dados ja e do tipo `text`, sem limite -- nenhuma alteracao no banco necessaria

### 2. Logica de Data de Inicio da Contagem

Atualmente, ao gerar parcelas com "Data Inicio 1a Parcela" = 27/02 e intervalo = 7 dias:
- Parcela 1: 27/02 (dia 0)
- Parcela 2: 06/03 (dia 7)
- Parcela 3: 13/03 (dia 14)

O comportamento desejado e que a data informada seja a **data de inicio da contagem**, nao a data da primeira parcela. Ou seja:
- Parcela 1: 06/03 (contagem + 7 dias)
- Parcela 2: 13/03 (contagem + 14 dias)
- Parcela 3: 20/03 (contagem + 21 dias)

**Arquivo:** `src/components/os-financeiro/FinanceiroTab.tsx`

Alteracoes:
1. **Label**: Trocar "Data Inicio 1a Parcela" para "Data Inicio Contagem"
2. **Calculo das parcelas** (funcao `doGenerateInstallments`): Mudar o array de dias de `[0, 30, 60, ...]` para `[interval, interval*2, interval*3, ...]`. Ou seja, a linha:
   ```
   const installmentDays = Array.from({ length: installmentCount }, (_, i) => installmentInterval * i);
   ```
   passa a ser:
   ```
   const installmentDays = Array.from({ length: installmentCount }, (_, i) => installmentInterval * (i + 1));
   ```
3. **Calculo dos dias na tabela** (`calculateDays`): A logica de exibicao de "Dias" na coluna da tabela de parcelas sera ajustada para calcular a partir da data de inicio da contagem (paymentStartDate) em vez da data da primeira parcela

### O que NAO muda
- Parcelas ja existentes e suas datas permanecem intactas
- Nenhuma alteracao no banco de dados
- O campo `payment_config` salvo continua com a mesma estrutura
- Nenhum outro componente ou arquivo e afetado
