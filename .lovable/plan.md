
# Plano: Padronização Global de Layout das Páginas

## Problema Identificado

Existem **dois padrões de layout** diferentes nas páginas do sistema:

| Padrão | Classes CSS | Onde é usado | Resultado |
|--------|-------------|--------------|-----------|
| **A (Otimizado)** | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` | ServiceCalls, Technicians, Vehicles | Conteúdo próximo à sidebar, margem direita variável |
| **B (Centralizado)** | `container mx-auto px-4` | Clients, Equipment, Dashboard, etc. | Conteúdo centralizado com margens iguais |

A tela de **ServiceCallView** está ainda pior com:
```css
w-full max-w-full min-w-0 -ml-4 lg:-ml-4 pl-1 pr-4 sm:pr-8
```
Isso cria margens inconsistentes e causa espaçamento excessivo.

---

## Solução: Classe Padrão Única

Adotar o padrão da tela de **Chamados Técnicos (ServiceCalls)** como referência global:

```css
w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6
```

**Características:**
- `w-full max-w-[1400px]`: Largura máxima controlada
- `mr-auto`: Margem direita automática (empurra para esquerda)
- `pl-1 sm:pl-2`: Padding esquerdo mínimo
- `pr-4 sm:pr-6`: Padding direito moderado
- `py-6 space-y-6`: Espaçamento vertical padrão

---

## Arquivos a Modificar

### Grupo 1: Listagens (container mx-auto → padrão otimizado)
| Arquivo | Linha | De | Para |
|---------|-------|-----|------|
| Clients.tsx | 55 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| Equipment.tsx | 60 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| Checklists.tsx | 54 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| Products.tsx | 65 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| Dashboard.tsx | 192 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| ServiceCallTrips.tsx | 42 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| TechnicianMap.tsx | 129 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| VehicleMaintenances.tsx | 75 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| CadastrosClientesFornecedores.tsx | 118 | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| PaymentMethods.tsx | - | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| ServiceTypes.tsx | - | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |
| ServiceCallStatuses.tsx | - | `container mx-auto px-4` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |

### Grupo 2: ServiceCallView (corrigir margens negativas)
| Arquivo | Linha | De | Para |
|---------|-------|-----|------|
| ServiceCallView.tsx | 264 | `w-full max-w-full min-w-0 -ml-4 lg:-ml-4 pl-1 pr-4 sm:pr-8` | `w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6` |

### Grupo 3: Formulários (manter max-w-2xl ou max-w-4xl para compactar)
Formulários como ClientForm, TechnicianForm, etc. mantêm `container mx-auto px-4 max-w-2xl` porque são páginas de edição que se beneficiam de largura reduzida para facilitar leitura.

### Grupo 4: Páginas Financeiras (já usam padrão correto)
ContasAPagar, ContasAReceber, FluxoDeCaixa já usam o padrão otimizado. Apenas pequenos ajustes de consistência no padding.

---

## Seção Técnica

### Mudança Principal
```tsx
// ANTES (centralizado com margens iguais)
<div className="container mx-auto px-4 py-6 space-y-6">

// DEPOIS (alinhado à esquerda com max-width)
<div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
```

### ServiceCallView - Correção Específica
```tsx
// ANTES (margem negativa problemática)
<div className="w-full max-w-full min-w-0 -ml-4 lg:-ml-4 pl-1 pr-4 sm:pr-8 py-6 space-y-6">

// DEPOIS (consistente com listagem)
<div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
```

---

## Resumo de Arquivos

**Total: ~18 arquivos**

Listagens para alterar:
1. `src/pages/Clients.tsx`
2. `src/pages/Equipment.tsx`
3. `src/pages/Checklists.tsx`
4. `src/pages/Products.tsx`
5. `src/pages/Dashboard.tsx`
6. `src/pages/ServiceCallTrips.tsx`
7. `src/pages/TechnicianMap.tsx`
8. `src/pages/VehicleMaintenances.tsx`
9. `src/pages/CadastrosClientesFornecedores.tsx`
10. `src/pages/PaymentMethods.tsx`
11. `src/pages/ServiceTypes.tsx`
12. `src/pages/ServiceCallStatuses.tsx`
13. `src/pages/ServiceCallView.tsx`
14. `src/pages/Schedule.tsx`
15. `src/pages/Inicio.tsx`

Páginas de formulários (manter compactos):
- ClientForm, TechnicianForm, EquipmentForm, etc. → sem alteração

---

## Resultado Esperado

Após implementação:
- Todas as telas de listagem terão o mesmo alinhamento à esquerda
- Conteúdo fica próximo à sidebar sem margem excessiva
- Margem direita variável absorve espaços em monitores grandes
- Visualização de OS funciona corretamente em 100% de zoom
- Consistência visual em todo o sistema
