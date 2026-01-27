
## Plano: Simplificação da Lista de OS + Novo Fluxo de Visualização/Edição

### Resumo das Alterações Solicitadas

1. **Lista de OS** (`ServiceCalls.tsx`): Mostrar apenas 5 colunas + Ações
   - Nº OS
   - Cliente
   - Técnico
   - Situação Técnica
   - Situação Comercial
   - Ações (manter sticky)
   
   **Colunas a OCULTAR** (não deletar dados):
   - Data/Hora
   - Equipamento
   - Tipo

2. **Ao clicar em uma OS**: Abrir no formato de formulário igual à criação, porém com:
   - Campos pré-preenchidos e TRAVADOS (readonly)
   - Botões no topo direito: **Editar**, **Salvar**, **Cancelar/Voltar**
   - Edição só habilitada ao clicar em "Editar"

---

### Análise Técnica

#### Estrutura Atual de Rotas:
- `/service-calls` → Lista (`ServiceCalls.tsx`)
- `/service-calls/:id` → Visualização resumida em cards (`ServiceCallView.tsx`)
- `/service-calls/edit/:id` → Formulário de edição (`ServiceCallForm.tsx`)
- `/service-calls/new` → Formulário de criação (`ServiceCallForm.tsx`)

#### Novo Comportamento Desejado:
Clicar na OS deve abrir o **formulário completo** (como criar nova OS), mas em **modo readonly** com botões de controle.

**Opção escolhida:** Modificar `ServiceCallView.tsx` para renderizar o formulário em modo readonly, OU modificar `ServiceCallForm.tsx` para ter um estado `isReadonly`.

**Melhor abordagem:** Adicionar um parâmetro de modo ao `ServiceCallForm.tsx` para distinguir entre:
- Modo criação (sem id)
- Modo visualização (com id, readonly=true)
- Modo edição (com id, readonly=false após clicar "Editar")

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ServiceCalls.tsx` | Ocultar colunas Data/Hora, Equipamento, Tipo. Ajustar larguras |
| `src/pages/ServiceCallForm.tsx` | Adicionar estado `isReadonly` e controlar campos habilitados/desabilitados |
| `src/App.tsx` | **Nenhuma alteração** - rotas permanecem as mesmas |
| `src/pages/ServiceCallView.tsx` | **Nenhuma alteração** - não será mais usado no fluxo principal, mas mantido |

---

### Detalhamento das Mudanças

#### 1. `ServiceCalls.tsx` - Ocultar Colunas na Tabela Desktop

**Colunas visíveis:**
```
Nº OS | Cliente | Técnico | St. Técnico | St. Comercial | Ações
```

**Mudanças no `<colgroup>`:**
```tsx
<colgroup>
  <col style={{ width: '80px' }} />   {/* Nº OS */}
  <col style={{ width: '220px' }} />  {/* Cliente */}
  <col style={{ width: '120px' }} />  {/* Técnico */}
  <col style={{ width: '160px' }} />  {/* St. Técnico */}
  <col style={{ width: '160px' }} />  {/* St. Comercial */}
  <col style={{ width: '80px' }} />   {/* Ações - sticky */}
</colgroup>
```

**Total: 820px** (mais confortável para telas menores)

**Remover do `<thead>` e `<tbody>`:**
- Coluna Data/Hora
- Coluna Equipamento
- Coluna Tipo

**Nota:** Os dados continuam sendo carregados do banco, apenas não são exibidos na tabela.

---

#### 2. `ServiceCallForm.tsx` - Adicionar Modo Readonly

**Novo estado:**
```tsx
const [isReadonly, setIsReadonly] = useState(true); // Inicia em readonly quando editando
```

**Lógica:**
- Se `isEditMode` (tem id na URL) → iniciar como `readonly=true`
- Se criação nova (`!isEditMode`) → iniciar como `readonly=false`

**Botões no Header (substituir atual):**
```tsx
{/* Header com Breadcrumb e Botões de Ação */}
<div className="flex items-center justify-between gap-4 flex-wrap">
  {/* Breadcrumb */}
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={() => navigate("/service-calls")}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Voltar
    </Button>
    <span className="text-muted-foreground">›</span>
    <span className="text-muted-foreground text-sm">Chamados</span>
    {isEditMode && existingCall && (
      <>
        <span className="text-muted-foreground">›</span>
        <span className="font-semibold text-sm">OS #{existingCall.os_number}</span>
      </>
    )}
  </div>
  
  {/* Botões de Ação */}
  <div className="flex items-center gap-2 shrink-0">
    {isEditMode && isReadonly && (
      <Button onClick={() => setIsReadonly(false)}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Button>
    )}
    
    {isEditMode && !isReadonly && (
      <>
        <Button onClick={handleSubmit(onSubmit)}>
          <Save className="mr-2 h-4 w-4" />
          Salvar
        </Button>
        <Button variant="outline" onClick={() => {
          // Cancelar edição - voltar ao modo readonly e restaurar dados
          initializedRef.current = false; // Força re-inicialização
          setIsReadonly(true);
        }}>
          Cancelar
        </Button>
      </>
    )}
    
    {!isEditMode && (
      <Button onClick={handleSubmit(onSubmit)} disabled={isUploading}>
        {isUploading ? "Salvando..." : "Criar Chamado"}
      </Button>
    )}
  </div>
</div>
```

**Desabilitar campos quando `isReadonly=true`:**

Para cada input/select/textarea, adicionar:
```tsx
disabled={isReadonly}
```

Exemplo:
```tsx
<Input 
  {...register("equipment_description")} 
  disabled={isReadonly}
  className={isReadonly ? "bg-muted" : ""}
/>
```

**Componentes que precisam de `disabled`:**
- Todos os `<Input>`
- Todos os `<Textarea>`
- Todos os `<Select>` (usar `disabled` prop)
- `ClientAsyncSelect` (adicionar prop `isDisabled`)
- `TimePickerPopover` (adicionar prop `disabled`)
- Botões de gravação de áudio
- Uploads de mídia
- ChecklistSelector
- SignaturePad

---

#### 3. Navegação: Lista → Formulário

Atualmente a navegação vai para `/service-calls/:id` (ServiceCallView).

**Mudar para ir direto ao formulário:**
```tsx
// Em ServiceCalls.tsx
onClick={() => navigate(`/service-calls/edit/${call.id}`)}
```

E nos Links:
```tsx
<Link to={`/service-calls/edit/${call.id}`}>
  {call.os_number}
</Link>
```

---

#### 4. Mobile Card (`ServiceCallMobileCard.tsx`)

Atualizar o card mobile para corresponder às colunas visíveis:

**Remover:**
- Data/Hora (ou manter já que é útil no mobile?)
- Equipamento
- Tipo

**Decisão:** No mobile, manter Data/Hora pois é informação essencial para técnicos. Remover Equipamento e Tipo para consistência.

---

### Arquivos NÃO Alterados (Conforme Solicitado)

| Arquivo | Status |
|---------|--------|
| `ServiceCallView.tsx` | Preservado - não usado no novo fluxo mas mantido |
| `FinanceiroTab.tsx` | Preservado |
| `FinanceiroGuard.tsx` | Preservado |
| CSS global | Preservado |
| Rotas em App.tsx | Preservado - usa rotas existentes |
| Base de dados | Nenhuma alteração |

---

### Fluxo Final

1. **Lista** (`/service-calls`): Colunas simplificadas
2. **Clicar em OS** → Abre `/service-calls/edit/:id`
3. **Formulário abre em modo READONLY**: Campos preenchidos e travados
4. **Clicar "Editar"** → Habilita campos para edição
5. **Clicar "Salvar"** → Salva e volta para readonly
6. **Clicar "Cancelar"** → Descarta mudanças e volta para readonly
7. **Clicar "Voltar"** → Retorna para a lista

---

### Critérios de Aceite

1. Lista exibe apenas: Nº OS, Cliente, Técnico, St. Técnico, St. Comercial, Ações
2. Colunas ocultas (Data/Hora, Equipamento, Tipo) ainda existem nos dados
3. Clicar em OS abre formulário em modo readonly
4. Botões "Editar", "Salvar", "Cancelar/Voltar" funcionam corretamente
5. Campos só editáveis após clicar em "Editar"
6. Aba Financeiro continua visível apenas para Admin
7. Nenhuma alteração no banco de dados
8. Funciona igual no Preview e Published

---

### Seção Técnica - Principais Mudanças de Código

**ServiceCalls.tsx:**
- Remover 3 `<col>` do colgroup
- Remover 3 `<th>` do thead
- Remover 3 `<td>` do tbody
- Mudar navegação para `/service-calls/edit/:id`

**ServiceCallForm.tsx:**
- Adicionar estado `isReadonly` (default: `isEditMode`)
- Adicionar header com breadcrumb e botões condicionais
- Adicionar `disabled={isReadonly}` em todos os campos de input
- Adicionar estilo visual para campos readonly (`bg-muted`)
- Handler para "Cancelar" que restaura dados originais

**ServiceCallMobileCard.tsx:**
- Remover linha de Equipamento
- Atualizar navegação para `/service-calls/edit/:id`
