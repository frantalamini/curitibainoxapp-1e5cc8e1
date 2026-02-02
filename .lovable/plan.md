
# Plano: Seletores de Status com Controle de Permissão

## Resumo
Implementar campos de seleção para Status Tecnico e Status Comercial na tela de edicao da OS, com controle de acesso baseado no perfil do usuario:
- **Status Tecnico**: Tecnicos, ADM e Gerencial podem alterar
- **Status Comercial**: Apenas ADM e Gerencial podem alterar

## Contexto Atual

Atualmente os status sao exibidos apenas de forma estatica na listagem de OS (badges coloridos). Nao existe campo de edicao de status na tela de edicao da OS (`ServiceCallForm.tsx`). Os status sao definidos automaticamente ao criar uma nova OS com valores padrao.

---

## Arquitetura da Solucao

```text
+------------------+         +---------------------+
|  ServiceCallForm |  uses   |  StatusSelectField  |
|  (Aba Geral)     | ------> |  (Novo componente)  |
+------------------+         +---------------------+
         |                            |
         |                   Verifica permissao via:
         |                   - useUserRole (isAdmin)
         |                   - useCurrentUserPermissions (profileType)
         v
+------------------+
|  service_calls   |
|  status_id       |
|  commercial_     |
|  status_id       |
+------------------+
```

---

## Componentes a Criar/Modificar

### 1. Novo Componente: `StatusSelectField`
Componente reutilizavel de selecao de status com logica de permissao embutida.

**Funcionalidades:**
- Recebe `statusType` ('tecnico' | 'comercial')
- Verifica automaticamente se o usuario pode editar
- Se nao pode editar: exibe badge estatico (somente leitura)
- Se pode editar: exibe dropdown de selecao
- Carrega apenas status ativos do tipo correspondente

### 2. Modificar: `ServiceCallForm.tsx`
Adicionar os dois campos de status na aba "Geral", apos o campo de Tipo de Servico.

**Mudancas:**
- Importar novo componente `StatusSelectField`
- Adicionar estados para `selectedStatusId` e `selectedCommercialStatusId`
- Inicializar estados com valores existentes (em modo edicao)
- Incluir valores no payload de atualizacao

---

## Logica de Permissao

| Perfil     | Status Tecnico | Status Comercial |
|------------|---------------|------------------|
| Tecnico    | Pode alterar  | Somente leitura  |
| ADM        | Pode alterar  | Pode alterar     |
| Gerencial  | Pode alterar  | Pode alterar     |

**Implementacao:**
```typescript
// Para Status Tecnico
const canEditTechnicalStatus = isAdmin || isTechnician;

// Para Status Comercial  
const canEditCommercialStatus = isAdmin;
// OU via permissions: profileType === 'gerencial' || profileType === 'adm'
```

---

## Layout no Formulario

Na aba "Geral", apos o campo "Tipo de Servico":

```
+-------------------------------------+
| Status Tecnico   | Status Comercial |
| [Select v]       | [Select v]       | (se pode editar)
| ou               | ou               |
| [Badge estatico] | [Badge estatico] | (se somente leitura)
+-------------------------------------+
```

---

## Detalhes Tecnicos

### Novo Componente `StatusSelectField`
```typescript
// src/components/service-calls/StatusSelectField.tsx
interface StatusSelectFieldProps {
  statusType: 'tecnico' | 'comercial';
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

### Atualizacao do ServiceCallForm
```typescript
// Estados novos
const [selectedStatusId, setSelectedStatusId] = useState<string>("");
const [selectedCommercialStatusId, setSelectedCommercialStatusId] = useState<string>("");

// Inicializacao (useEffect existingCall)
setSelectedStatusId(existingCall.status_id || "");
setSelectedCommercialStatusId(existingCall.commercial_status_id || "");

// No payload de update
const updatePayload = {
  ...otherFields,
  status_id: selectedStatusId || null,
  commercial_status_id: selectedCommercialStatusId || null,
};
```

---

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `src/components/service-calls/StatusSelectField.tsx` | Criar (novo componente) |
| `src/pages/ServiceCallForm.tsx` | Modificar (adicionar campos de status) |

---

## Seguranca

- As permissoes sao verificadas no frontend para UX
- A seguranca real esta nas RLS policies do Supabase que ja existem
- Tecnicos so podem atualizar OS atribuidas a eles
- Somente admins podem alterar campos sensíveis via policies existentes

---

## Fluxo do Usuario

**Tecnico:**
1. Abre OS atribuida a ele
2. Clica em "Editar"
3. Ve campo "Status Tecnico" editavel
4. Ve campo "Status Comercial" como badge (somente leitura)
5. Altera o status tecnico e salva

**ADM/Gerencial:**
1. Abre qualquer OS
2. Clica em "Editar"
3. Ve ambos os campos editaveis
4. Pode alterar qualquer status e salvar
