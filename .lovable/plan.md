## Logistica de Entrega para Vendas - IMPLEMENTADO

### Status: ✅ Concluído

### O que foi implementado

1. **Banco de dados**: Tabelas `sale_delivery_trips` e `sale_delivery_proofs` com RLS, indexes e triggers
2. **Storage**: Bucket privado `sale-attachments` para fotos e assinaturas
3. **Otimizador de rotas**: `src/lib/routeOptimizer.ts` usando nearest-neighbor
4. **Hooks**: `useSaleDeliveryTrips.ts` e `useSaleDeliveryProof.ts`
5. **Páginas**: `SaleDeliveries.tsx` (painel) e `SaleDeliveryFlow.tsx` (fluxo sequencial)
6. **Rotas**: `/vendas/entregas` e `/vendas/entregas/:routeGroupId`
7. **Menu**: Item "Entregas" no submenu Vendas
8. **Ações**: "Registrar Entrega" nos dropdowns de SalesTable e SaleMobileCard para vendas SALE/INVOICED
