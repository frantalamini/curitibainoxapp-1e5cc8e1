

## Plano: Correção Definitiva do Layout da Tabela + Publicação

### Problema Identificado

1. **OS não clicável** → Alterações não foram publicadas ainda
2. **Coluna cortada** → A largura mínima da tabela (950px) não está sendo respeitada quando há sidebar aberta

---

### Análise Técnica

A tabela atual tem:
- Soma das colunas: 935px
- Padding total (~16px por célula × 8 colunas): ~32-64px extras
- **Largura real necessária: ~1000px**

O container `overflow-x-auto` funciona, mas o `minWidth: 950px` inline não está forçando o scroll corretamente em todos os navegadores.

---

### Mudança 1: Ajustar Estrutura da Tabela (`src/pages/ServiceCalls.tsx`)

**Problema:** O `<colgroup>` + `minWidth` inline pode ser ignorado em alguns navegadores.

**Solução:** Envolver a tabela em um `div` com largura mínima explícita:

```tsx
{/* ANTES */}
<div className="w-full overflow-x-auto border rounded-lg">
  <table style={{ tableLayout: 'fixed', minWidth: '950px' }}>

{/* DEPOIS */}
<div className="w-full overflow-x-auto border rounded-lg">
  <div style={{ minWidth: '1020px' }}>
    <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
```

O `minWidth` no wrapper interno força o scroll quando a viewport é menor.

---

### Mudança 2: Aumentar Largura das Colunas de Status

Os dropdowns de status precisam de mais espaço para exibir o texto completo:

| Coluna | Largura Atual | Largura Nova |
|--------|--------------|--------------|
| Nº OS | 70px | 70px |
| Data/Hora | 85px | 90px |
| Cliente | 180px | 200px |
| Equipamento | 150px | 170px |
| Tipo | 100px | 120px |
| Técnico | 80px | 90px |
| St. Técnico | 135px | 140px |
| St. Comercial | 135px | 140px |
| **TOTAL** | **935px** | **1020px** |

---

### Mudança 3: Nenhuma Mudança no CSS Global

O `index.css` já está correto com:
- `.app-shell { overflow-x: auto }`
- Não há `overflow-x: hidden` bloqueando

---

### Sobre a Publicação

Após implementar as correções, você precisará:

1. Clicar em **"Publicar"** (botão no canto superior direito do Lovable)
2. Aguardar o deploy concluir
3. Testar no ambiente publicado (curitibainoxapp.lovable.app)

⚠️ **Importante:** As alterações de navegação (OS clicável → Visualização) já estão no código, mas só funcionarão no ambiente publicado após você clicar em "Publicar".

---

### Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/ServiceCalls.tsx` | Adicionar wrapper com `minWidth: 1020px`, ajustar larguras do `<colgroup>` |

---

### Critérios de Aceite

1. ✅ Tabela mostra todas as 8 colunas sem corte
2. ✅ Scroll horizontal aparece quando viewport é menor que 1020px
3. ✅ Colunas de status cabem o texto completo
4. ✅ Após publicar, clicar no Nº OS abre a visualização

