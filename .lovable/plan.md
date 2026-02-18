

## Habilitar acesso financeiro da OS para o usuario Jonatas

### Diagnostico

O usuario Jonatas (profile_type: **adm**) tem as permissoes do modulo `finances` todas desabilitadas (`can_view = false`, `can_edit = false`, `can_delete = false`). O `FinanceiroGuard` so libera acesso para perfil **gerencial** (acesso total) ou para quem tem `can_view = true` no modulo `finances`. Como nenhuma das duas condicoes e atendida, ele ve "Acesso Restrito".

### Solucao

Atualizar as permissoes do Jonatas no banco de dados, habilitando `can_view`, `can_edit` e `can_delete` para o modulo `finances`.

**Nenhum arquivo de codigo sera modificado.** Apenas uma atualizacao de dados no banco.

### Detalhes Tecnicos

Executar a seguinte migracao SQL:

```sql
UPDATE public.user_permissions
SET can_view = true, can_edit = true, can_delete = true, updated_at = now()
WHERE user_id = 'f8032b50-2892-45bd-9aaa-723e6dc23ca7'
  AND module = 'finances';
```

Isso habilita o acesso completo (consultar, editar, excluir) ao modulo Financeiro da OS para o Jonatas, mantendo o perfil **adm** dele inalterado.

Nenhuma rota, componente ou estrutura de banco sera alterada.

