
# Plano: Notificações Instantâneas com Supabase Realtime

## Resumo

Implementar notificações em tempo real para técnicos quando uma nova OS é atribuída a eles. Atualmente o sistema usa polling (verifica a cada 60 segundos), mas vamos adicionar Supabase Realtime para notificação instantânea.

---

## O Que Muda Para o Usuário

| Antes | Depois |
|-------|--------|
| Técnico espera até 60 segundos para ver nova OS | Notificação aparece instantaneamente |
| Apenas polling periódico | Realtime + polling como backup |
| Delay perceptível | Experiência fluida e responsiva |

---

## Implementação

### 1. Migração: Habilitar Realtime na Tabela service_calls

Executar SQL para adicionar a tabela `service_calls` à publicação realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE service_calls;
```

### 2. Atualizar Hook useNotifications

Modificar `src/hooks/useNotifications.ts` para:

1. **Adicionar subscription Realtime** que escuta INSERTs e UPDATEs na tabela `service_calls`
2. **Filtrar eventos** apenas para o `technician_id` do técnico logado
3. **Invalidar cache** do React Query quando um evento chegar
4. **Reduzir refetchInterval** de 60s para 30s como backup

Estrutura do código:

```typescript
// Subscription Realtime
useEffect(() => {
  if (!technicianId) return;

  const channel = supabase
    .channel(`notifications-${technicianId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE
        schema: 'public',
        table: 'service_calls',
        filter: `technician_id=eq.${technicianId}`
      },
      (payload) => {
        // Invalidar cache para forçar refetch
        queryClient.invalidateQueries({
          queryKey: ['technician-notifications', technicianId]
        });
        queryClient.invalidateQueries({
          queryKey: ['new-service-calls-count', technicianId]
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [technicianId, queryClient]);
```

### 3. Ajustar Intervalo de Polling

Alterar `refetchInterval` de 60 segundos para 30 segundos como fallback de segurança caso o Realtime tenha algum problema momentâneo.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Habilitar Realtime na tabela service_calls |
| `src/hooks/useNotifications.ts` | Modificar | Adicionar subscription Realtime + reduzir polling |

---

## Fluxo Técnico

```text
┌─────────────────────────────────────────────────────────────┐
│                 ADMIN CRIA NOVA OS                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ INSERT service_calls │
              │ technician_id = X    │
              └─────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               │               ▼
    ┌──────────┐          │         ┌──────────┐
    │ Realtime │          │         │ Polling  │
    │ (instant)│          │         │ (30s)    │
    └──────────┘          │         └──────────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ invalidateQueries() │
              │ refetch notificações│
              └─────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ UI ATUALIZA         │
              │ Badge + Lista       │
              └─────────────────────┘
```

---

## Seção Técnica

### Configuração do Canal Realtime

O Supabase Realtime funciona via WebSocket, mantendo uma conexão persistente com o banco de dados. Quando há uma mudança na tabela filtrada, o evento é enviado ao cliente em milissegundos.

### Filtro por Técnico

Usamos `filter: technician_id=eq.${technicianId}` para que cada técnico receba apenas eventos das suas próprias OS, não sobrecarregando com dados irrelevantes.

### Limpeza de Recursos

O `return () => supabase.removeChannel(channel)` garante que a subscription seja removida quando o componente desmonta ou o `technicianId` muda, evitando memory leaks.

---

## Benefícios

1. **Latência mínima**: Notificação chega em ~100-500ms após criação da OS
2. **Menos requisições**: Realtime é mais eficiente que polling frequente
3. **Experiência melhorada**: Técnico vê imediatamente quando recebe trabalho
4. **Fallback robusto**: Polling a cada 30s garante funcionamento mesmo se Realtime falhar

