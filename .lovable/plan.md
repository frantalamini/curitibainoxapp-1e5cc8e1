
# Plano: Corrigir Menção no Chat Interno

## Problema Identificado

O popover de menção não está funcionando porque **existem dois Popovers idênticos** (um para mobile e um para desktop) que compartilham o **mesmo estado `showMentions`**.

### Estrutura Atual com Problema

```
ChatInput.tsx
├── Mobile (sm:hidden)
│   └── Popover open={showMentions}  ← Mesmo estado
│
├── Desktop (hidden sm:flex)
│   └── Popover open={showMentions}  ← Mesmo estado (conflito!)
```

Quando clica no botão de menção:
1. O estado `showMentions` é alterado para `true`
2. **Ambos** os Popovers tentam abrir simultaneamente
3. O Portal do Popover Desktop (mesmo oculto) interfere com o do mobile

## Solução Proposta

Criar estados separados para mobile e desktop, evitando o conflito:

```typescript
const [showMentionsMobile, setShowMentionsMobile] = useState(false);
const [showMentionsDesktop, setShowMentionsDesktop] = useState(false);
```

### Estrutura Corrigida

```
ChatInput.tsx
├── Mobile (sm:hidden)
│   └── Popover open={showMentionsMobile}  ← Estado independente
│
├── Desktop (hidden sm:flex)
│   └── Popover open={showMentionsDesktop}  ← Estado independente
```

## Alterações no Código

### Arquivo: `src/components/service-calls/ChatInput.tsx`

| Linha | Alteração |
|-------|-----------|
| ~70 | Substituir `showMentions` por dois estados separados |
| ~94-100 | Atualizar `handleKeyDown` para usar estado correto (desktop) |
| ~114 | Atualizar `addMention` para fechar ambos os popovers |
| ~301 | Alterar popover mobile para usar `showMentionsMobile` |
| ~412 | Alterar popover desktop para usar `showMentionsDesktop` |

### Mudanças Detalhadas

**1. Novos Estados (linha ~70)**
```typescript
// ANTES
const [showMentions, setShowMentions] = useState(false);

// DEPOIS
const [showMentionsMobile, setShowMentionsMobile] = useState(false);
const [showMentionsDesktop, setShowMentionsDesktop] = useState(false);
```

**2. handleKeyDown (linha ~94)**
```typescript
// ANTES
if (e.key === '@') {
  setShowMentions(true);
}
if (e.key === 'Escape') {
  setShowMentions(false);
}

// DEPOIS
if (e.key === '@') {
  // Desktop only - mobile usa o botão
  setShowMentionsDesktop(true);
}
if (e.key === 'Escape') {
  setShowMentionsMobile(false);
  setShowMentionsDesktop(false);
}
```

**3. addMention (linha ~114)**
```typescript
// ANTES
setShowMentions(false);

// DEPOIS
setShowMentionsMobile(false);
setShowMentionsDesktop(false);
```

**4. Popover Mobile (linha ~301)**
```typescript
// ANTES
<Popover open={showMentions} onOpenChange={setShowMentions}>

// DEPOIS
<Popover open={showMentionsMobile} onOpenChange={setShowMentionsMobile}>
```

**5. Popover Desktop (linha ~412)**
```typescript
// ANTES
<Popover open={showMentions} onOpenChange={setShowMentions}>

// DEPOIS
<Popover open={showMentionsDesktop} onOpenChange={setShowMentionsDesktop}>
```

## Resumo

Uma única alteração no arquivo `ChatInput.tsx` para separar os estados dos popovers de menção entre mobile e desktop, evitando conflito de Portal entre componentes.
