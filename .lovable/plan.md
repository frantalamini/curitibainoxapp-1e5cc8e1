
# Plano: Correção de Acesso dos Técnicos aos Chamados

## Diagnóstico

O problema é uma **combinação de dados não vinculados + política RLS restritiva**.

### Situação Atual

```text
+-------------------+        +-------------------+        +-------------------+
|    user_roles     |        |    technicians    |        |  service_calls    |
+-------------------+        +-------------------+        +-------------------+
| user_id: abc123   |   X    | id: xyz789        |   -->  | technician_id:    |
| role: technician  |  NÃO   | user_id: NULL     |        |     xyz789        |
|                   | VINC.  | full_name: Jose   |        |                   |
+-------------------+        +-------------------+        +-------------------+
```

Quando um técnico (user_id: abc123) tenta ver chamados:
1. A query `service_calls` faz JOIN com `technicians`
2. A política RLS de `technicians` exige `auth.uid() = user_id`
3. Como `user_id = NULL`, o técnico não consegue ver o registro
4. O join falha silenciosamente e retorna dados vazios

### Causa Raiz

A tabela `technicians` possui registros **sem** `user_id` preenchido, impossibilitando que a política RLS identifique quem pode ver quem.

---

## Solução em Duas Partes

### Parte 1: Atualizar Política RLS (Urgente)

Modificar a política de SELECT da tabela `technicians` para permitir que **qualquer usuário com role technician** possa ver **todos os técnicos** (necessário para dropdowns e listagens).

```sql
-- Remover política restritiva atual
DROP POLICY IF EXISTS "Technicians can view their own profile" ON public.technicians;

-- Nova política: Técnicos podem ver todos os técnicos (para dropdown/lista)
CREATE POLICY "Technicians can view all technicians"
  ON public.technicians
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'technician'::app_role)
  );
```

Isso é seguro porque:
- A tabela `technicians` não contém dados sensíveis (só nome e telefone)
- É necessário para exibir listas de técnicos em dropdowns
- Mantém consistência com as políticas de `service_calls`

### Parte 2: Vincular Dados (Opcional, mas recomendado)

Para funcionalidades futuras e melhor rastreabilidade, vincular os `user_id` dos usuários aos registros de técnicos:

```sql
-- Exemplo de vinculação (ajustar conforme correspondência de nomes)
UPDATE technicians SET user_id = 'dd80bce6-64a9-46a3-842e-2005695dffd3' 
WHERE full_name ILIKE '%Anderson%' AND user_id IS NULL;
```

Essa vinculação deve ser feita manualmente verificando as correspondências corretas.

---

## Arquivos a Modificar

| Tipo | Alteração |
|------|-----------|
| Migração SQL | Atualizar política RLS de `technicians` |

---

## Detalhes Técnicos

### Migração SQL Proposta

```sql
-- 1. Remover política restritiva que causa o bloqueio
DROP POLICY IF EXISTS "Technicians can view their own profile" ON public.technicians;

-- 2. Criar política permissiva para leitura (SELECT)
-- Técnicos E admins podem ver todos os registros de técnicos
CREATE POLICY "Admins and technicians can view all technicians"
  ON public.technicians
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'technician'::app_role)
  );
```

### Por que isso resolve

Com a nova política:
1. Técnico faz login e tem role `technician` na tabela `user_roles`
2. Função `has_role()` confirma que ele é técnico
3. Política RLS permite que ele leia `technicians`
4. Query de `service_calls` com JOIN funciona corretamente
5. Chamados são exibidos normalmente

### Segurança Mantida

- INSERT: Apenas admins (já configurado)
- UPDATE próprio: Técnicos podem editar seu próprio registro (já configurado)
- UPDATE geral: Apenas admins (já configurado)
- DELETE: Não permitido (já configurado)

A única mudança é no SELECT, que agora é permissivo para leitura - o que faz sentido pois não há dados sensíveis.

---

## Resumo

1. Uma única migração SQL que atualiza a política RLS de `technicians`
2. Nenhuma mudança de código frontend necessária
3. Resolve imediatamente o problema de visualização para técnicos
4. Recomendação adicional: vincular `user_id` aos técnicos para rastreabilidade futura
