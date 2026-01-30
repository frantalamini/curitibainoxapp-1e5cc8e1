
# Plano: Corrigir Bug de Navegação ao Digitar Espaço no Marcador

## Problema Identificado
Quando você digita um marcador e pressiona **espaço** para continuar escrevendo, o sistema navega para a OS porque:

1. A TableRow tem um handler `onKeyDown` que escuta a tecla espaço
2. O evento de teclado do Input está "vazando" para a TableRow pai
3. Isso dispara `onRowClick(id)` ao invés de simplesmente adicionar espaço ao texto

## Solução
Adicionar `e.stopPropagation()` no handler `onKeyDown` do Input para impedir que o evento de teclado suba para a TableRow.

---

## Arquivo a Modificar

**`src/components/service-calls/ServiceCallActionsMenu.tsx`**

### Mudança no handleKeyDown (linha 83-87)

```text
DE:
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !isSaving) {
    handleAddMarker();
  }
};

PARA:
const handleKeyDown = (e: React.KeyboardEvent) => {
  // Impede que eventos de teclado "vazem" para a TableRow
  e.stopPropagation();
  
  if (e.key === "Enter" && !isSaving) {
    handleAddMarker();
  }
};
```

## Por que isso resolve?

| Evento | Antes | Depois |
|--------|-------|--------|
| Espaço no Input | Borbulha → TableRow detecta → Navega | Bloqueado no Input → Apenas adiciona espaço |
| Enter no Input | Borbulha + adiciona marcador | Bloqueado + adiciona marcador |
| Outras teclas | Borbulham | Bloqueadas (comportamento correto) |

---

## Mudança Adicional de Segurança

Também vou adicionar `onKeyDown={(e) => e.stopPropagation()}` no `DialogContent` para garantir que nenhum evento de teclado escape do modal.

```text
DE:
<DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>

PARA:
<DialogContent 
  className="sm:max-w-md" 
  onClick={(e) => e.stopPropagation()}
  onKeyDown={(e) => e.stopPropagation()}
>
```

---

## Resultado Esperado

Após a correção:
- Digitar espaço no campo de marcador → funciona normalmente
- Pressionar Enter → adiciona o marcador
- Clicar no + → adiciona o marcador
- Você permanece na tela de listagem das OS
