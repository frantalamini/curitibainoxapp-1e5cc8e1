

## Plano: Corrigir Conciliação Bancária Travada Após Importação OFX

### Problema Raiz
Bug de **race condition** no React: `parseOFXFile` salva o extrato via `setState` e em seguida `runAIMatching` tenta ler esse estado — mas o state ainda não atualizou. Resultado: matching nunca executa, e como a UI só mostra os 3 painéis quando há sugestões, o usuário fica numa tela vazia.

### Correções

**1. Passar o statement diretamente para `runAIMatching`** (`useOFXReconciliation.ts`)
- Alterar `runAIMatching` para aceitar um parâmetro opcional `statement?: OFXStatement` e usá-lo em vez de ler do state
- Assim elimina a race condition

**2. Adicionar botão "Conciliar com IA"** (`ConciliacaoBancaria.tsx`)
- Quando o OFX foi importado mas não há sugestões, mostrar as transações OFX em uma lista simples com um botão "Conciliar com IA" para (re)executar o matching manualmente
- Também mostrar cada transação OFX com botão "Incluir" para inclusão manual direta (sem depender do matching)

**3. Mostrar transações OFX mesmo sem matching** (`ConciliacaoBancaria.tsx`)
- Alterar a condição de exibição: em vez de `matchSuggestions.length > 0`, mostrar a seção sempre que `ofxStatement` existir
- Quando não há sugestões, listar as transações do OFX com opções de ação (Incluir, Retry IA)

### Arquivos alterados
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOFXReconciliation.ts` | `runAIMatching` aceita statement como parâmetro |
| `src/pages/financas/ConciliacaoBancaria.tsx` | Passa statement, mostra fallback com transações OFX + botão retry |

### Impacto
- Nenhum outro arquivo alterado
- Fluxo de caixa, contas a pagar/receber, permissões inalterados

