
## Plano de Correção: Chamados Nao Salvando

### Problema Identificado

Ao criar um novo chamado, o sistema exibe a mensagem "Chamado Criado com sucesso!" e redireciona para a lista, mas o chamado nao foi salvo no banco de dados.

Causa: O codigo chama `createServiceCall()` que usa internamente `.mutate()` (fire-and-forget). Imediatamente apos, mostra o toast de sucesso e navega para outra pagina, sem aguardar a resposta do banco. Se houver qualquer erro na insercao, ele e ignorado silenciosamente.

### Solucao

Alterar para usar a versao async da mutation e aguardar sua conclusao antes de mostrar sucesso.

### Alteracoes

| Arquivo | Mudanca |
|---------|---------|
| src/hooks/useServiceCalls.ts | Exportar `createServiceCallAsync` (mutateAsync) junto com `createServiceCall` |
| src/pages/ServiceCallForm.tsx | Usar `createServiceCallAsync` com await e tratar erros adequadamente |

### Detalhes Tecnicos

**1. useServiceCalls.ts (linha 387)**

Adicionar a exportacao da versao async:

```text
ANTES:
return {
  ...
  createServiceCall: createMutation.mutate,
  ...
}

DEPOIS:
return {
  ...
  createServiceCall: createMutation.mutate,
  createServiceCallAsync: createMutation.mutateAsync, // NOVO
  ...
}
```

**2. ServiceCallForm.tsx (linha 80)**

Importar a nova funcao:

```text
ANTES:
const { createServiceCall, updateServiceCallAsync } = useServiceCalls();

DEPOIS:
const { createServiceCallAsync, updateServiceCallAsync } = useServiceCalls();
```

**3. ServiceCallForm.tsx (linhas 1004-1016)**

Usar await e try/catch:

```text
ANTES:
createServiceCall({...});
setNewSignatures([]);
toast({ title: "Chamado Criado" });
navigate("/service-calls");

DEPOIS:
try {
  await createServiceCallAsync({...});
  setNewSignatures([]);
  toast({ title: "Chamado Criado" });
  navigate("/service-calls");
} catch (createError) {
  console.error('Erro ao criar chamado:', createError);
  // Toast de erro ja e exibido pelo hook
}
```

### Impacto

- O sistema aguardara a confirmacao do banco antes de mostrar sucesso
- Erros de insercao serao tratados adequadamente
- O usuario vera mensagem de erro se algo falhar
- Nenhuma outra parte do sistema sera afetada
