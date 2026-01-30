
# Plano: Corrigir Vulnerabilidades de Segurança

## Resumo Executivo
Vou corrigir os 3 erros detectados no scan de segurança:
1. Atualizar a biblioteca jsPDF para eliminar a vulnerabilidade crítica
2. Implementar rate limiting no login para bloquear ataques de força bruta
3. Marcar os avisos de dados como "resolvidos" (já estão protegidos por RLS)

---

## 1. Atualizar jsPDF (5 min)

**Arquivo:** `package.json`

**Mudança:**
```json
// DE:
"jspdf": "^3.0.3"

// PARA:
"jspdf": "^4.0.0"
```

**Verificação:** Testar o botão "Exportar PDF" no Dashboard após a atualização.

---

## 2. Implementar Rate Limiting no Login (20 min)

**Arquivo:** `supabase/functions/login-with-username/index.ts`

**Estratégia:** Usar um sistema de rate limiting baseado em memória (Map) com limite de 5 tentativas por IP a cada 15 minutos.

**Implementação:**

```typescript
// Rate limiting simples baseado em memória
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Limpar registro expirado
  if (record && now > record.resetAt) {
    rateLimitMap.delete(ip);
    return true;
  }
  
  // Novo IP
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  
  // Verificar limite
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  // Incrementar contador
  record.count++;
  return true;
}
```

**Fluxo da função atualizada:**
1. Extrair IP do header `x-forwarded-for`
2. Verificar rate limit antes de processar
3. Se bloqueado → retornar erro 429 com mensagem amigável
4. Se permitido → continuar com o login normal

**Mensagem de bloqueio (PT-BR):**
> "Muitas tentativas de login. Aguarde 15 minutos e tente novamente."

---

## 3. Atualizar Status dos Findings de Segurança

Após as correções, vou atualizar o scanner de segurança para:
- **Marcar como ignorados** os avisos sobre dados de funcionários/clientes (já têm RLS adequado)
- **Remover** o aviso de vulnerabilidade de dependências (após atualização do jsPDF)

---

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `package.json` | Atualizar versão do jspdf |
| `supabase/functions/login-with-username/index.ts` | Adicionar rate limiting |

---

## Seção Técnica

### Por que usar rate limiting em memória?
- **Simplicidade:** Não requer dependências externas (Redis, etc.)
- **Eficácia:** Funciona bem para o volume de usuários típico
- **Limitação:** Reinicia se a Edge Function for reiniciada (aceitável para este caso)

### Alternativa mais robusta (futuro)
Para produção de alto volume, considerar:
- Upstash Redis (integração nativa com Deno)
- Supabase Database com tabela de rate limiting

### Segurança das tabelas
As tabelas `technicians` e `clients` já possuem:
- RLS habilitado com políticas restritivas
- Técnicos só veem seus próprios dados
- Clientes só são visíveis durante OS ativas
- Admins têm acesso total (esperado)

---

## Resultado Esperado
Após implementar:
- ✅ 0 vulnerabilidades críticas em dependências
- ✅ Login protegido contra força bruta
- ✅ Avisos de dados marcados como "protegidos adequadamente"
