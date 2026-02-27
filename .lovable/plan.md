

## Abas por Status Comercial na Listagem de Chamados

### O que sera feito

Adicionar abas dinamicas na pagina de Chamados Tecnicos, baseadas nos **status comerciais** cadastrados. As abas serao geradas automaticamente a partir dos status comerciais existentes no banco -- ou seja, ao criar um novo status comercial, ele aparecera como uma nova aba automaticamente, sem necessidade de nenhuma alteracao no codigo.

### Como vai funcionar

- **Aba "Todas"**: mostra todos os chamados, independente do status comercial (comportamento atual)
- **Uma aba por status comercial**: "Aguardando aprovacao", "Aprovado", "Cancelado", "Faturado" (e qualquer outro que for criado no futuro)
- Cada aba exibira a **contagem** de OS naquele status comercial
- Ao mudar o status comercial de uma OS (via formulario ou menu rapido), ela automaticamente aparecera na aba correta ao recarregar/navegar
- O **filtro de status tecnico** (dropdown) continuara funcionando normalmente, combinando com a aba selecionada
- A aba "Novos" para tecnicos sera mantida como esta

### Sobre criar novos status comerciais

**Nao precisa definir antes.** O sistema lera os status comerciais dinamicamente do banco de dados. Ao cadastrar um novo status comercial em Configuracoes > Status de Chamados, ele aparecera automaticamente como uma nova aba na listagem.

### Detalhes Tecnicos

**Arquivos alterados:**

1. **`src/hooks/useServiceCalls.ts`**
   - Adicionar filtro `commercialStatusId` nas opcoes de filtro
   - Quando preenchido, aplicar `.eq("commercial_status_id", commercialStatusId)` na query
   - Nao alterar nenhuma outra logica existente (busca, paginacao, ordenacao)

2. **`src/pages/ServiceCalls.tsx`**
   - Adicionar estado `commercialTab` (valor: `"all"` ou o ID do status comercial)
   - Extrair status comerciais de `statuses` (filtrar por `status_type === 'comercial'`)
   - Renderizar abas horizontais (desktop) com scroll e dropdown (mobile) -- similar ao componente `CadastrosTabs`
   - Cada aba mostra nome + contagem
   - Passar `commercialStatusId` para o hook `useServiceCalls`
   - Manter tabs "Todos/Novos" para tecnicos separadamente (sem conflito)
   - Reset de pagina ao trocar de aba

3. **Contagem por aba**: Adicionar uma query auxiliar que busca a contagem de OS por `commercial_status_id` usando `group by` ou queries paralelas, para exibir os numeros nas abas sem afetar a listagem principal.

**O que NAO sera alterado:**
- Banco de dados / migrations
- Rotas
- Componentes de tabela e cards
- Logica de status tecnico
- Numeracao de OS
- Nenhum outro fluxo existente

### Layout visual

```text
[Todas (2793)] [Ag. Aprovacao (332)] [Aprovado (36)] [Cancelado (206)] [Faturado (2206)]
```

Desktop: abas horizontais com scroll se necessario
Mobile: dropdown/select (como ja funciona no CadastrosTabs)

