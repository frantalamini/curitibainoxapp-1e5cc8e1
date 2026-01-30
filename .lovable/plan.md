
## Plano de Alteração - Aba Técnico da OS

### Objetivo
Reorganizar os elementos da aba "Informações Técnicas" conforme solicitado:

1. **Remover** a seção de gravação de áudio
2. **Reordenar** o Checklist para antes das "Fotos - Depois da Manutenção"

---

### Nova Ordem dos Elementos (Aba Técnico)

| # | Seção | Status |
|---|-------|--------|
| 1 | Análises e Providências Realizadas | Mantido |
| 2 | Mídia (Antes da Manutenção) | Mantido |
| 3 | Checklist de Verificação | **Movido para cá** |
| 4 | Mídia (Depois da Manutenção) | Mantido |
| 5 | Assinatura do Técnico | Mantido |
| 6 | Assinatura do Responsável (Cliente) | Mantido |

A seção "Gravação de Áudio (Informações Técnicas)" será completamente removida.

---

### Detalhes Técnicos

**Arquivo a ser modificado:** `src/pages/ServiceCallForm.tsx`

**Mudanças:**

1. **Remover seção de áudio (linhas 1539-1587)**
   - Remove o bloco completo de gravação de áudio
   - Os estados relacionados (`technicalAudioFile`, `isRecordingTechnical`, etc.) podem ser mantidos por ora para evitar erros, mas ficam inutilizados

2. **Mover Checklist (linhas 1617-1624)**
   - Atualmente está após "Mídia (Depois da Manutenção)"
   - Será movido para logo após "Mídia (Antes da Manutenção)"

**Resultado visual:**

```text
┌─────────────────────────────────────┐
│ Análises e Providências Realizadas  │
│ (textarea)                          │
├─────────────────────────────────────┤
│ Mídia (Antes da Manutenção)         │
│ [slots de fotos/vídeo]              │
├─────────────────────────────────────┤
│ Checklist de Verificação            │  ← Movido para cá
│ ○ Item 1  ○ Item 2  ...             │
├─────────────────────────────────────┤
│ Mídia (Depois da Manutenção)        │
│ [slots de fotos/vídeo]              │
├─────────────────────────────────────┤
│ Assinatura do Técnico               │
├─────────────────────────────────────┤
│ Assinatura do Cliente               │
└─────────────────────────────────────┘
```

---

### Impacto

- Nenhuma funcionalidade será perdida (exceto gravação de áudio conforme solicitado)
- O campo de texto "Análises e Providências Realizadas" permanece como única forma de inserir informações técnicas escritas
- O fluxo visual fica mais lógico: antes → checklist → depois → assinaturas
