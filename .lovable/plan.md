

# Plano: Restringir Edição da Aba Geral para Técnicos

## Problema Identificado

Atualmente, quando um técnico clica em "Editar", **todas as abas ficam editáveis**, incluindo a aba "Geral" com dados do cliente, equipamento, técnico responsável e tipo de serviço. Isso permite que técnicos alterem informações que deveriam ser controladas apenas por ADM/Gerencial.

## Solução Proposta

Criar um controle de permissão por aba:
- **Técnicos**: Só podem editar a aba "Técnico" (informações técnicas, fotos, assinaturas)
- **ADM/Gerencial**: Podem editar todas as abas

---

## Arquitetura da Solução

```text
+------------------+     +-----------------------+
|  Usuário clica   | --> | Verifica perfil       |
|  em "Editar"     |     | (isAdmin/isTechnician)|
+------------------+     +-----------------------+
                                   |
             +---------------------+---------------------+
             |                                           |
             v                                           v
   +-------------------+                      +-------------------+
   | ADM/Gerencial     |                      | Técnico           |
   | isReadonly=false  |                      | isReadonly=false  |
   | (todas as abas)   |                      | isGeralReadonly   |
   +-------------------+                      | =true (aba Geral) |
                                              +-------------------+
```

---

## Mudanças Detalhadas

### 1. Novo Estado: `isGeralReadonly`

```typescript
// Estado separado para controle da aba Geral
const isGeralReadonly = isTechnician && !isAdmin;
```

### 2. Modificar Campos da Aba "Geral"

Todos os campos da aba "Geral" usarão a condição:

```typescript
// Antes (atual)
disabled={isReadonly && isEditMode}

// Depois (novo)
disabled={(isReadonly || isGeralReadonly) && isEditMode}
```

**Campos afetados na aba Geral:**
- Cliente (ClientAsyncSelect)
- Equipamento (Input)
- Fabricante (Input)
- Setor (Input)
- Modelo (Input)
- Número de Série (Input)
- Número OC (Input)
- Descrição do Problema (Textarea)
- Técnico Responsável (Select)
- Tipo de Serviço (Select)
- Status Técnico (StatusSelectField) - já tem lógica própria
- Status Comercial (StatusSelectField) - já tem lógica própria
- Checklist Aplicável (Select)
- Data e Hora Agendada (Input + Calendar + Time)
- Local do Atendimento (Input)
- Observações Internas (Textarea)

### 3. Comportamento Visual

Para técnicos em modo edição:
- A aba "Geral" mostrará todos os campos com fundo cinza (visual readonly)
- A aba "Técnico" ficará editável normalmente
- A aba "Financeiro" permanece controlada pelo FinanceiroGuard (já existente)
- A aba "Chat" permanece funcional (já existente)

---

## Fluxo do Usuário

**Técnico:**
1. Abre a OS
2. Clica em "Editar"
3. Na aba "Geral": todos os campos permanecem readonly (fundo cinza)
4. Na aba "Técnico": campos editáveis (diagnóstico, fotos, assinaturas)
5. Salva apenas as informações técnicas

**ADM/Gerencial:**
1. Abre a OS
2. Clica em "Editar"
3. Todas as abas ficam editáveis
4. Pode alterar qualquer campo

---

## Arquivo Afetado

| Arquivo | Ação |
|---------|------|
| `src/pages/ServiceCallForm.tsx` | Adicionar lógica de `isGeralReadonly` e aplicar em todos os campos da aba Geral |

---

## Segurança

Esta é uma proteção de UX (frontend). A segurança real está nas RLS policies do backend que já existem e restringem o que técnicos podem atualizar.

