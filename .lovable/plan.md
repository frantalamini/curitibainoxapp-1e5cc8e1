
### Contexto validado
- OS 2844 no banco: due_date = 2026-02-27 em financial_transactions (direção RECEIVE).
- Problema relatado: no PDF financeiro aparece 26/02/2026.
- Código atual do PDF financeiro: `src/lib/generateOSPdf.tsx` mapeia parcelas em `fetchFinancialData` (linha ~410) e formata vencimento via `format(parseLocalDate(t.due_date), 'dd/MM/yyyy')`.
- Restrições: correção cirúrgica, sem alterar rotas, schema, fluxo UI já estável.

### Hipótese técnica principal
- O deslocamento de 1 dia acontece quando a data chega em formato com timezone/UTC (ex.: `YYYY-MM-DDT00:00:00Z`) e passa por `Date`.
- Mesmo com `parseLocalDate`, ainda existe risco em strings com `T` porque hoje elas são parseadas diretamente como timestamp.
- Para vencimento de parcela (campo de negócio “date-only”), a estratégia mais segura é **não depender de timezone** para formatar.

### Objetivo da correção
Garantir que o vencimento exibido no PDF financeiro reflita exatamente o dia salvo no backend (date-only), sem retroagir/adiantar por fuso.

### Plano de implementação (cirúrgico)
1. **Criar formatação determinística para vencimento financeiro (date-only)**
   - Arquivo: `src/lib/generateOSPdf.tsx`
   - Adicionar helper local (somente para PDF financeiro), por exemplo:
     - Extrair a parte `YYYY-MM-DD` de `t.due_date` (inclusive quando vier com timestamp).
     - Converter para `dd/MM/yyyy` por string (sem `new Date`), com fallback seguro.
   - Resultado: `2026-02-27` sempre vira `27/02/2026`, independentemente do timezone do cliente.

2. **Trocar apenas o ponto de montagem das parcelas no PDF**
   - Arquivo: `src/lib/generateOSPdf.tsx` (bloco `fetchFinancialData`, mapping de `installments`).
   - Substituir:
     - `dueDate: format(parseLocalDate(t.due_date), 'dd/MM/yyyy', { locale: ptBR })`
   - Por:
     - `dueDate: formatFinancialDueDate(t.due_date)` (helper determinístico).
   - Não alterar lógica de totais, filtros, query, assinatura, upload ou fluxo de geração.

3. **Manter isolado para não impactar o restante do sistema**
   - Não mexer em:
     - `src/lib/dateUtils.ts` (evita efeito colateral global agora)
     - schema/migrations
     - telas/rotas de financeiro
     - fluxo de geração e compartilhamento do PDF

### Validação (obrigatória antes de concluir)
1. Regerar **PDF Completo** da OS 2844.
2. Conferir tabela “Condições de Pagamento”:
   - esperado: vencimento `27/02/2026`.
3. Conferir não-regressão:
   - PDF técnico continua gerando normal.
   - Financeiro da OS continua com mesmos valores/parcelas.
   - Sem alteração de comportamento em contas a pagar/receber.

### Critérios de aceite
- Vencimento no PDF financeiro igual ao vencimento salvo (sem -1 dia).
- Correção aplicada apenas no pipeline de renderização de parcelas do PDF.
- Nenhuma mudança estrutural em banco, rotas ou fluxo de UI já validado.

### Arquivo que será alterado
- `src/lib/generateOSPdf.tsx` (somente)
