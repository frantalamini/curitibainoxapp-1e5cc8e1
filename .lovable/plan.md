
## Plano: Adicionar Campos Fabricante e Setor na Seção de Equipamento

### Resumo
Vou ajustar a seção de equipamento na OS para incluir os campos **Fabricante** e **Setor**, reorganizando o layout para ficar lado a lado conforme o modelo:

**Layout Atual:** Equipamento (6/12) | Nº Série (3/12) | Nº OC (3/12)

**Layout Novo:** Equipamento | Fabricante | Setor | Nº Série (10 chars) | Nº OC (10 chars)

---

### Etapa 1: Migração de Banco de Dados

Adicionar duas novas colunas na tabela `service_calls`:

```sql
ALTER TABLE service_calls 
ADD COLUMN IF NOT EXISTS equipment_manufacturer TEXT,
ADD COLUMN IF NOT EXISTS equipment_sector TEXT;
```

---

### Etapa 2: Atualizar Formulário

**Arquivo:** `src/pages/ServiceCallForm.tsx`

**Mudança no grid (linhas 1158-1201):**

- Alterar o grid de 12 colunas para acomodar 5 campos
- Proporções sugeridas para o novo layout:
  - Equipamento: flex-1 (ocupa espaço restante)
  - Fabricante: 2/12
  - Setor: 2/12
  - Nº Série: tamanho fixo para ~10 caracteres
  - Nº OC: tamanho fixo para ~10 caracteres

**Código do novo grid:**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
  {/* Equipamento - flexível */}
  <div className="lg:col-span-4 space-y-2">
    <Label>Equipamento *</Label>
    <Input {...register("equipment_description")} />
  </div>

  {/* Fabricante */}
  <div className="lg:col-span-2 space-y-2">
    <Label>Fabricante</Label>
    <Input {...register("equipment_manufacturer")} />
  </div>

  {/* Setor */}
  <div className="lg:col-span-2 space-y-2">
    <Label>Setor</Label>
    <Input {...register("equipment_sector")} />
  </div>

  {/* Nº Série */}
  <div className="lg:col-span-2 space-y-2">
    <Label>Nº Série</Label>
    <Input maxLength={15} {...} />
  </div>

  {/* Nº OC */}
  <div className="lg:col-span-2 space-y-2">
    <Label>OC</Label>
    <Input maxLength={10} {...} />
  </div>
</div>
```

---

### Etapa 3: Atualizar useEffect de Inicialização

Na inicialização do formulário ao editar uma OS, preencher os novos campos:

```tsx
setValue("equipment_manufacturer", existingCall.equipment_manufacturer || "");
setValue("equipment_sector", existingCall.equipment_sector || "");
```

---

### Etapa 4: Atualizar Payload de Envio

No `onSubmit`, incluir os novos campos no objeto `formattedData`:

```tsx
equipment_manufacturer: data.equipment_manufacturer || null,
equipment_sector: data.equipment_sector || null,
```

---

### Arquivos Impactados

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| Migração SQL | Adicionar 2 colunas |
| `src/pages/ServiceCallForm.tsx` | Layout + campos |
| `src/hooks/useServiceCalls.ts` | Incluir novos campos na interface (opcional - tipagem) |

---

### Resultado Visual

No desktop (tela grande):

```
+-------------+------------+--------+-----------+-------+
| Equipamento | Fabricante | Setor  | Nº Série  |  OC   |
+-------------+------------+--------+-----------+-------+
| [........] | [........] | [....] | [10 char] | [10c] |
+-------------+------------+--------+-----------+-------+
```

No mobile: campos empilhados verticalmente, 2 por linha em tablets.
