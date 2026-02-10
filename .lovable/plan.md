

## Logistica de Entrega para Vendas - Deslocamento + Rota + Comprovante

### Como vai funcionar

O entregador tera um fluxo completo de entregas, semelhante ao deslocamento de tecnicos nos chamados:

1. **Painel de Entregas Pendentes** - Pagina `/vendas/entregas` listando todas as vendas com status SALE/INVOICED que ainda nao foram entregues, com opcao de selecionar multiplas entregas para otimizar rota
2. **Calculo de Rota Otimizada** - Ao selecionar 2 ou mais entregas, o sistema calcula a melhor sequencia de visitas baseada na distancia entre os enderecos dos clientes (algoritmo nearest-neighbor usando coordenadas GPS via geocodificacao)
3. **Fluxo Sequencial de Entregas** - O entregador inicia o deslocamento para a primeira entrega. Ao chegar, registra a entrega (fotos + assinatura). Ao concluir, o sistema automaticamente sugere iniciar o deslocamento para a proxima entrega da rota
4. **Comprovante de Entrega** - Em cada parada, o entregador tira fotos e colhe assinatura (reusando MediaSlots e SignaturePad). Ao finalizar, pode gerar PDF e enviar via WhatsApp

### Fluxo do Entregador (Mobile)

```text
Painel de Entregas
       |
[Seleciona entregas]
       |
[Calcular Melhor Rota] --> Exibe ordem otimizada
       |
[Iniciar Rota] --> Abre GPS para 1a entrega
       |
[Cheguei] --> Registra fotos + assinatura
       |
[Proxima Entrega] --> Abre GPS para 2a entrega
       |
  ... repete ...
       |
[Rota Concluida]
```

---

### Detalhes Tecnicos

#### 1. Nova tabela: `sale_delivery_trips`

Armazena cada deslocamento de entrega, identica em estrutura a `service_call_trips`:

```sql
CREATE TABLE sale_delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(user_id),
  vehicle_id UUID REFERENCES vehicles(id),
  route_group_id UUID,  -- agrupa entregas da mesma rota
  route_order INT,      -- posicao na rota otimizada
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','em_deslocamento','concluido')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  origin_lat NUMERIC, origin_lng NUMERIC,
  destination_lat NUMERIC, destination_lng NUMERIC,
  current_lat NUMERIC, current_lng NUMERIC,
  estimated_distance_km NUMERIC,
  distance_km NUMERIC,
  position_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Nova tabela: `sale_delivery_proofs`

Armazena o comprovante de entrega (fotos + assinatura):

```sql
CREATE TABLE sale_delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES sale_delivery_trips(id),
  receiver_name TEXT NOT NULL,
  receiver_position TEXT,
  signature_storage_path TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. Bucket de storage: `sale-attachments`

Bucket privado para fotos de entrega e assinaturas digitais.

#### 4. Novos arquivos a criar

- **`src/pages/vendas/SaleDeliveries.tsx`** - Painel principal de entregas pendentes. Lista vendas finalizadas sem comprovante. Permite selecionar multiplas e calcular rota otimizada. Mostra cards com endereco do cliente, valor e status de entrega.

- **`src/pages/vendas/SaleDeliveryFlow.tsx`** - Pagina do fluxo sequencial de entregas. Mostra a entrega atual (posicao X de N), botoes "Iniciar Deslocamento" e "Cheguei", e formulario de comprovante (fotos + assinatura). Ao concluir uma, avanca automaticamente para a proxima.

- **`src/hooks/useSaleDeliveryTrips.ts`** - Hook para CRUD de deslocamentos de entrega, tracking GPS (reutiliza logica do `useGpsTracking`), e calculo de rota otimizada.

- **`src/hooks/useSaleDeliveryProof.ts`** - Hook para CRUD de comprovantes, upload de fotos/assinatura para o bucket `sale-attachments`.

- **`src/lib/routeOptimizer.ts`** - Funcao que recebe uma lista de coordenadas (clientes) e a posicao atual do entregador, e retorna a ordem otimizada usando algoritmo nearest-neighbor (vizinho mais proximo). Usa a funcao `haversineDistance` ja existente em `geoUtils.ts`.

- **`src/lib/generateDeliveryPdf.tsx`** - Componente React-PDF para gerar comprovante em PDF com dados da venda, fotos, assinatura e data/hora da entrega.

#### 5. Arquivos modificados

- **`src/App.tsx`** - Adicionar rotas `/vendas/entregas` e `/vendas/entregas/:routeGroupId`
- **`src/components/vendas/SalesTable.tsx`** - Adicionar opcao "Registrar Entrega" no dropdown para vendas SALE/INVOICED
- **`src/components/vendas/SaleMobileCard.tsx`** - Mesma opcao no card mobile
- **`src/components/MainLayout.tsx`** - Adicionar item "Entregas" no submenu de Vendas (icone de caminhao)

#### 6. Calculo de Rota Otimizada

O sistema geocodifica os enderecos dos clientes selecionados usando a Edge Function `geocode-address` existente, depois aplica o algoritmo nearest-neighbor:

1. Pega a posicao atual do entregador (GPS)
2. Encontra o cliente mais proximo
3. A partir desse cliente, encontra o proximo mais proximo nao visitado
4. Repete ate visitar todos
5. Retorna a lista ordenada com distancias estimadas entre cada parada

#### 7. Componentes reutilizados (sem modificacao)

- `MediaSlots` - Upload de fotos com preview
- `SignaturePad` / `SignatureModal` - Coleta de assinatura digital
- `StartTripModal` - Modal de iniciar deslocamento (selecao de veiculo + GPS)
- `EndTripModal` - Modal de chegada
- `SendReportModal` - Envio via WhatsApp/Email
- `useGpsTracking` - Rastreamento GPS durante deslocamento

