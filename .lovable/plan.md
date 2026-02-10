
## Adicionar busca por numero de OS no seletor de Ordem de Servico

Substituir o componente `Select` do campo "Vincular a OS" por um **Popover + Command** (combobox com busca), permitindo digitar o numero da OS para filtrar rapidamente a lista.

### Arquivos modificados

1. **`src/components/reimbursements/AdminReimbursementModal.tsx`** - Substituir o `Select` de OS por um Combobox com campo de busca integrado usando `Popover` + `Command` (cmdk). O usuario podera digitar o numero da OS ou nome do cliente para filtrar.

2. **`src/components/reimbursements/TechnicianReimbursementModal.tsx`** - Mesma substituicao do seletor de OS por Combobox com busca.

### Detalhes tecnicos

- Usar os componentes `Popover`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` ja existentes no projeto (`src/components/ui/command.tsx` e `src/components/ui/popover.tsx`)
- O campo de busca filtrara por numero da OS (`os_number`) e nome do cliente (`clients.full_name`)
- Ao selecionar uma OS, o popover fecha e exibe o numero selecionado no botao trigger
- Manter toda a logica existente de filtragem por tecnico no modal admin
- Nao alterar nenhum outro componente ou funcionalidade
