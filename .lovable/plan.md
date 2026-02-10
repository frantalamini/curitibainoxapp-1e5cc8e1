

## Plano de Correção - Gestão de Reembolso Técnico

Foram identificados **3 problemas** que impedem o funcionamento correto do módulo de reembolso:

---

### Problema 1: Reembolso nao salva (admin bloqueado pela seguranca do banco)

A politica de seguranca da tabela `technician_reimbursements` permite INSERT apenas para tecnicos. Quando o administrador tenta registrar um reembolso, o banco de dados rejeita a operacao silenciosamente.

**Correcao:** Adicionar uma nova politica de INSERT que permita administradores inserirem reembolsos.

---

### Problema 2: OCR nao le o valor da nota (URL da API incorreta)

A funcao de backend que processa a imagem do comprovante esta usando uma URL incorreta (`ai.lovable.dev`) ao inves da URL correta (`ai.gateway.lovable.dev`). Isso causa um erro de DNS e a leitura automatica falha.

**Correcao:** Atualizar a URL na funcao `extract-receipt-amount` para `https://ai.gateway.lovable.dev/v1/chat/completions`.

---

### Problema 3: Campo de valor sem mascara monetaria

O campo "Valor (R$)" aceita qualquer texto livre (letras, simbolos, etc). Precisa de uma mascara que aceite apenas numeros no formato monetario brasileiro (ex: 1.234,56).

**Correcao:** Implementar uma funcao de mascara monetaria no campo de valor, tanto no modal do tecnico (`TechnicianReimbursementModal`) quanto no modal do admin (`AdminReimbursementModal`). A mascara formatara automaticamente o valor digitado no padrao brasileiro (separador de milhar com ponto, decimal com virgula).

---

### Detalhes Tecnicos

**Arquivos modificados:**

1. `supabase/functions/extract-receipt-amount/index.ts` - Corrigir URL da API de `ai.lovable.dev` para `ai.gateway.lovable.dev`
2. `src/components/reimbursements/TechnicianReimbursementModal.tsx` - Adicionar mascara monetaria no campo de valor
3. `src/components/reimbursements/AdminReimbursementModal.tsx` - Adicionar mascara monetaria no campo de valor
4. Nova migracao SQL - Adicionar politica RLS de INSERT para admins na tabela `technician_reimbursements`

**SQL da migracao:**
```sql
CREATE POLICY "Admins can insert reimbursements"
  ON public.technician_reimbursements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

**Logica da mascara monetaria:**
- Aceitar apenas digitos
- Formatar automaticamente como `0,00`, `1,23`, `12,34`, `123,45`, `1.234,56`
- Converter corretamente para numero na hora de salvar (ex: `1.234,56` vira `1234.56`)

Nenhum outro arquivo ou funcionalidade sera alterado.

