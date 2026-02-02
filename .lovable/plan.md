
# Plano: Rastreamento GPS Automático Durante Deslocamento

## Resumo
Implementar atualização automática de coordenadas GPS a cada 30 segundos enquanto o técnico estiver com o app aberto durante um deslocamento ativo. O mapa administrativo receberá as atualizações em tempo real via Supabase Realtime (já configurado).

## Funcionamento

Quando um técnico iniciar um deslocamento e permanecer com o app aberto (mesmo que saia da OS e volte), o sistema capturará sua posição GPS automaticamente e enviará ao banco de dados. O mapa de técnicos refletirá a nova posição em tempo real.

**Limitação conhecida:** O rastreamento para quando o técnico fecha o app ou minimiza (limitação de PWA). O marcador no mapa mudará de verde para amarelo e depois cinza conforme o tempo sem atualização.

---

## Arquitetura da Solução

```text
+-------------------------+          +---------------------+
|  Técnico (PWA Mobile)   |   GPS    |   Supabase DB       |
|  useGpsTracking hook    | -------> |  service_call_trips |
|  (a cada 30s)           |          |  current_lat/lng    |
+-------------------------+          +---------------------+
                                              |
                                              | Realtime
                                              v
                                     +-------------------+
                                     |  Admin (Desktop)  |
                                     |  TechnicianMap    |
                                     +-------------------+
```

---

## Componentes a Criar/Modificar

### 1. Novo Hook: `useGpsTracking`
Gerencia o ciclo de vida do rastreamento GPS com `watchPosition` do navegador.

- Inicia automaticamente quando existe um deslocamento ativo (`activeTrip`)
- Atualiza `current_lat`, `current_lng` e `position_updated_at` no banco
- Throttle de 30 segundos entre updates (evita excesso de writes)
- Cleanup automático quando o deslocamento é encerrado ou o componente desmonta

### 2. Modificar: `ServiceCallForm.tsx`
Integrar o hook de tracking quando houver deslocamento em aberto.

- Importar e ativar `useGpsTracking(activeTrip)`
- O hook opera silenciosamente em background (sem UI)

### 3. Adicionar função em `geoUtils.ts`
Nova função `watchCurrentPosition` que encapsula a API `navigator.geolocation.watchPosition`.

---

## Detalhes Técnicos

### Hook `useGpsTracking`
```typescript
// src/hooks/useGpsTracking.ts
export function useGpsTracking(activeTrip: ServiceCallTrip | null | undefined) {
  // Usa watchPosition para receber atualizações contínuas
  // Throttle de 30s para evitar muitos writes
  // Atualiza via Supabase:
  //   UPDATE service_call_trips 
  //   SET current_lat = ?, current_lng = ?, position_updated_at = now()
  //   WHERE id = ?
}
```

### Fluxo de Dados
1. Técnico abre OS com deslocamento em aberto
2. Hook `useGpsTracking` detecta `activeTrip` e inicia `watchPosition`
3. A cada mudança de posição (max 1 update/30s), envia ao Supabase
4. Supabase Realtime notifica o mapa administrativo
5. Mapa atualiza o marcador do técnico

### Tratamento de Erros
- Se GPS falhar, aguarda próxima tentativa (não mostra erro ao usuário)
- Log discreto no console para debug
- Não interrompe o fluxo do técnico

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useGpsTracking.ts` | Criar (novo hook) |
| `src/lib/geoUtils.ts` | Adicionar função `watchCurrentPosition` |
| `src/pages/ServiceCallForm.tsx` | Integrar hook de tracking |

---

## Impacto no Usuário

**Técnico:**
- Nenhuma ação necessária
- Tracking acontece automaticamente enquanto app estiver aberto
- Sem pop-ups ou notificações extras

**Administrador:**
- Posição do técnico atualiza no mapa em tempo real (a cada ~30s)
- Marcador verde indica posição recente
- Se o técnico fechar o app, marcador muda para amarelo/cinza

---

## Observações Importantes

1. **Consumo de bateria:** `watchPosition` é eficiente, mas recomenda-se que o técnico mantenha o celular carregando no veículo
2. **Dados móveis:** Cada update é mínimo (~200 bytes)
3. **Permissão GPS:** Já solicitada no início do deslocamento (reutiliza a mesma)
