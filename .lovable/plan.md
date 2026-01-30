
# Plano de Implementação: Automação de Deslocamentos com GPS (Fase 1)

## Resumo Executivo

Este plano implementa a automação do cálculo de distância para deslocamentos de técnicos, eliminando a necessidade de digitar quilometragem manualmente. Também adiciona um mapa de monitoramento para visualizar a última posição conhecida dos técnicos em deslocamento.

---

## O Que Muda Para o Usuário

| Antes | Depois |
|-------|--------|
| Técnico digita km inicial e final | Distância calculada automaticamente pelo GPS |
| Sem visibilidade da localização | Mapa mostra última posição de cada técnico |
| Modal de finalização pede quilometragem | Modal simplificado - apenas confirmar chegada |
| Relatório depende de input manual | Distância real baseada em coordenadas GPS |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                    TÉCNICO (PWA)                            │
└─────────────────────────────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌────────┐         ┌────────────┐        ┌──────────┐
│ Inicia │         │  Navegando │        │ Chegou   │
│ Desloc.│         │  (GPS ext.)│        │ Cliente  │
└────────┘         └────────────┘        └──────────┘
    │                     │                     │
    │ 1. Captura GPS      │ App em             │ 1. Confirma
    │ 2. Geocodifica      │ background         │    chegada
    │    endereço         │ (sem dados)        │ 2. Distância
    │ 3. Calcula dist.    │                    │    já calculada
    │ 4. Salva no banco   │                    │
    ▼                     │                     ▼
┌────────────────────────┐            ┌────────────────────────┐
│ service_call_trips     │            │ Finaliza trip com      │
│ + origin_lat/lng       │            │ status = 'concluido'   │
│ + destination_lat/lng  │            │ (distância já existe)  │
│ + estimated_distance   │            └────────────────────────┘
└────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ADMINISTRADOR (Desktop)                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────┐
               │ Mapa de Técnicos │
               │ (última posição) │
               │ Leaflet/OSM      │
               └──────────────────┘
```

---

## Implementação Detalhada

### 1. Migração do Banco de Dados

Adicionar novos campos na tabela `service_call_trips`:

- `origin_lat` (NUMERIC) - Latitude da posição do técnico ao iniciar
- `origin_lng` (NUMERIC) - Longitude da posição do técnico ao iniciar
- `destination_lat` (NUMERIC) - Latitude do endereço do cliente
- `destination_lng` (NUMERIC) - Longitude do endereço do cliente
- `estimated_distance_km` (NUMERIC) - Distância calculada automaticamente
- `current_lat` (NUMERIC) - Última posição conhecida (para mapa)
- `current_lng` (NUMERIC) - Última posição conhecida (para mapa)
- `position_updated_at` (TIMESTAMP) - Quando a posição foi atualizada

Também habilitar Realtime na tabela para atualização do mapa em tempo real.

### 2. Edge Function: geocode-address

Criar função serverless para converter endereço em coordenadas usando OpenStreetMap/Nominatim (gratuito, sem API key).

Entrada:
```json
{
  "street": "RUA PADRE ANCHIETA",
  "number": "1291",
  "neighborhood": "BIGORRILHO",
  "city": "CURITIBA",
  "state": "PR",
  "cep": "80730-000"
}
```

Saída:
```json
{
  "lat": -25.4372,
  "lng": -49.2989,
  "success": true
}
```

### 3. Utilitário de Cálculo de Distância

Criar arquivo `src/lib/geoUtils.ts` com:

- Função `haversineDistance(lat1, lng1, lat2, lng2)` - Calcula distância em km entre dois pontos
- Função `getCurrentPosition()` - Wrapper para navigator.geolocation com Promise
- Constantes e helpers para geolocalização

### 4. Atualizar StartTripModal

O modal passará a:
1. Solicitar permissão de GPS ao técnico
2. Capturar coordenadas atuais (origem)
3. Receber endereço do cliente como prop
4. Chamar edge function para geocodificar destino
5. Calcular distância automaticamente
6. Retornar todos os dados para o handler

Props atualizadas:
```typescript
interface StartTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    vehicleId: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    estimatedDistanceKm: number;
  }) => void;
  clientAddress?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };
  isLoading?: boolean;
}
```

### 5. Simplificar EndTripModal

Remover campo de quilometragem obrigatória. O modal passará a:
1. Mostrar distância já calculada
2. Apenas confirmar chegada com um clique
3. Manter campo de km como opcional (fallback)

### 6. Atualizar Handlers no ServiceCallForm

Modificar `handleStartTrip` para:
1. Usar novos dados do modal (coordenadas + distância)
2. Salvar campos GPS no banco
3. Não depender mais de quilometragem do veículo

Modificar `handleEndTrip` para:
1. Apenas finalizar o status
2. Não calcular distância (já existe)

### 7. Atualizar Hook useServiceCallTrips

Expandir interfaces e tipos para incluir novos campos de coordenadas.

### 8. Criar Página do Mapa de Técnicos

Nova página `src/pages/TechnicianMap.tsx` com:
- Mapa interativo usando Leaflet
- Marcadores para cada técnico em deslocamento
- Popup com informações: nome, veículo, OS, cliente
- Auto-refresh a cada 30 segundos
- Realtime via Supabase para atualizações

### 9. Adicionar Dependências

Instalar pacotes necessários:
- `leaflet` - Biblioteca de mapas
- `react-leaflet` - Wrapper React para Leaflet
- `@types/leaflet` - Tipos TypeScript

### 10. Atualizar Navegação

Adicionar link "Mapa de Técnicos" no menu Agenda do MainLayout.

### 11. Atualizar Relatório de Deslocamentos

Modificar página ServiceCallTrips para:
- Mostrar "Distância GPS" em vez de "Distância (km)"
- Esconder colunas de quilometragem que ficaram obsoletas
- Adicionar coluna de coordenadas (tooltip)

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Novos campos de coordenadas na tabela |
| `supabase/functions/geocode-address/index.ts` | Criar | Edge function para geocodificação |
| `src/lib/geoUtils.ts` | Criar | Funções de cálculo Haversine e GPS |
| `src/components/StartTripModal.tsx` | Modificar | Adicionar captura GPS e geocodificação |
| `src/components/EndTripModal.tsx` | Modificar | Simplificar (remover km obrigatório) |
| `src/hooks/useServiceCallTrips.ts` | Modificar | Novos tipos e campos |
| `src/pages/ServiceCallForm.tsx` | Modificar | Handlers com coordenadas |
| `src/components/mobile/MobileHome.tsx` | Modificar | Handlers com coordenadas |
| `src/pages/TechnicianMap.tsx` | Criar | Mapa de monitoramento |
| `src/pages/ServiceCallTrips.tsx` | Modificar | Mostrar distância GPS |
| `src/components/MainLayout.tsx` | Modificar | Adicionar menu do mapa |
| `src/App.tsx` | Modificar | Nova rota /technician-map |

---

## Seção Técnica

### Fórmula Haversine

```typescript
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * 
    Math.cos(lat2 * Math.PI/180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distância em km
}
```

### Estrutura do Mapa (Leaflet)

```typescript
// Marcadores por tempo de atualização
const getMarkerColor = (lastUpdate: string) => {
  const minutesAgo = (Date.now() - new Date(lastUpdate).getTime()) / 60000;
  if (minutesAgo < 5) return 'green';   // Recente
  if (minutesAgo < 30) return 'yellow'; // Desatualizado
  return 'gray';                         // Offline
};

// Popup do marcador
<Popup>
  <strong>{technician.name}</strong>
  <p>Veículo: {vehicle.plate}</p>
  <p>OS: #{osNumber}</p>
  <p>Cliente: {client.name}</p>
  <p>Atualizado: {formatTimeAgo(lastUpdate)}</p>
</Popup>
```

### Realtime para Mapa

```sql
-- Habilitar realtime na tabela
ALTER PUBLICATION supabase_realtime ADD TABLE service_call_trips;
```

```typescript
// No frontend
const channel = supabase
  .channel('trips-map')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'service_call_trips',
    filter: 'status=eq.em_deslocamento'
  }, handlePositionUpdate)
  .subscribe();
```

---

## Limitações Conhecidas

1. **Precisão da distância**: Haversine calcula linha reta (~80-90% da rota real). Para 99% de precisão, seria necessário Google Directions API (custo adicional).

2. **Rastreamento contínuo**: Não é possível em PWA quando o app está em background. O mapa mostrará apenas a última posição capturada.

3. **Geocodificação gratuita**: Nominatim/OpenStreetMap tem rate limit. Para alto volume, considerar cache ou API paga.

---

## Próximos Passos (Fase 2 - Opcional)

1. Integrar Google Maps Directions API para distância exata de rota
2. Adicionar atualização periódica de posição enquanto app está aberto
3. Histórico de rotas percorridas
4. Alertas de desvio de rota
