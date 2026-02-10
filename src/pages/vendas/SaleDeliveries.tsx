import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Truck, Route, Navigation, User, Package } from "lucide-react";
import { usePendingDeliveries, useSaleDeliveryTripsMutations } from "@/hooks/useSaleDeliveryTrips";
import { getCurrentPosition, type GeoCoordinates } from "@/lib/geoUtils";
import { optimizeRoute, type DeliveryStop } from "@/lib/routeOptimizer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistance } from "@/lib/geoUtils";

export default function SaleDeliveries() {
  const navigate = useNavigate();
  const { data: pendingSales, isLoading } = usePendingDeliveries();
  const { createTrips } = useSaleDeliveryTripsMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isCalculating, setIsCalculating] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!pendingSales) return;
    if (selected.size === pendingSales.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingSales.map(s => s.id)));
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleCalculateRoute = useCallback(async () => {
    if (selected.size === 0) {
      toast.error("Selecione pelo menos uma entrega");
      return;
    }

    setIsCalculating(true);

    try {
      // 1. Get driver's current position
      const driverPos = await getCurrentPosition();

      // 2. Geocode all selected client addresses
      const selectedSales = pendingSales?.filter(s => selected.has(s.id)) || [];
      const stops: DeliveryStop[] = [];

      for (const sale of selectedSales) {
        const client = sale.clients;
        if (!client) continue;

        const hasAddress = client.street || client.city || client.cep;
        if (!hasAddress) {
          toast.warning(`Cliente "${client.full_name}" sem endereço cadastrado, será ignorado`);
          continue;
        }

        try {
          const { data } = await supabase.functions.invoke("geocode-address", {
            body: {
              street: client.street,
              number: client.number,
              neighborhood: client.neighborhood,
              city: client.city,
              state: client.state,
              cep: client.cep,
            },
          });

          if (data?.success && data.lat && data.lng) {
            stops.push({
              id: sale.id,
              coords: { lat: data.lat, lng: data.lng },
              label: client.full_name,
            });
          } else {
            toast.warning(`Endereço de "${client.full_name}" não encontrado`);
          }
        } catch {
          toast.warning(`Erro ao geocodificar "${client.full_name}"`);
        }
      }

      if (stops.length === 0) {
        toast.error("Nenhum endereço válido para calcular rota");
        return;
      }

      // 3. Optimize route
      const route = optimizeRoute(driverPos, stops);

      // 4. Create delivery trips with route_group_id
      const routeGroupId = crypto.randomUUID();
      const trips = route.stops.map((stop, idx) => ({
        sale_id: stop.id,
        route_group_id: routeGroupId,
        route_order: idx + 1,
        status: "pending",
        destination_lat: stop.coords.lat,
        destination_lng: stop.coords.lng,
        estimated_distance_km: route.legDistances[idx],
      }));

      await createTrips.mutateAsync(trips);

      toast.success(`Rota otimizada com ${stops.length} entregas criada!`);
      navigate(`/vendas/entregas/${routeGroupId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao calcular rota");
    } finally {
      setIsCalculating(false);
    }
  }, [selected, pendingSales, createTrips, navigate]);

  // Single delivery (no route optimization)
  const handleSingleDelivery = useCallback(async (saleId: string) => {
    const sale = pendingSales?.find(s => s.id === saleId);
    if (!sale) return;

    setIsCalculating(true);
    try {
      const routeGroupId = crypto.randomUUID();
      
      let destLat: number | undefined;
      let destLng: number | undefined;

      const client = sale.clients;
      if (client && (client.street || client.city || client.cep)) {
        try {
          const { data } = await supabase.functions.invoke("geocode-address", {
            body: {
              street: client.street,
              number: client.number,
              neighborhood: client.neighborhood,
              city: client.city,
              state: client.state,
              cep: client.cep,
            },
          });
          if (data?.success) {
            destLat = data.lat;
            destLng = data.lng;
          }
        } catch {}
      }

      await createTrips.mutateAsync([{
        sale_id: saleId,
        route_group_id: routeGroupId,
        route_order: 1,
        status: "pending",
        ...(destLat ? { destination_lat: destLat, destination_lng: destLng } : {}),
      }]);

      navigate(`/vendas/entregas/${routeGroupId}`);
    } catch (error) {
      toast.error("Erro ao iniciar entrega");
    } finally {
      setIsCalculating(false);
    }
  }, [pendingSales, createTrips, navigate]);

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Entregas Pendentes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingSales?.length || 0} entregas aguardando
            </p>
          </div>
        </div>

        {/* Action bar */}
        {selected.size > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selected.size} selecionada{selected.size > 1 ? "s" : ""}
              </span>
              <Button
                onClick={handleCalculateRoute}
                disabled={isCalculating}
                size="sm"
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Route className="h-4 w-4 mr-2" />
                )}
                {selected.size > 1 ? "Calcular Melhor Rota" : "Iniciar Entrega"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Select all */}
        {(pendingSales?.length || 0) > 1 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size === pendingSales?.length}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">Selecionar todas</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !pendingSales?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhuma entrega pendente</p>
              <p className="text-sm">Todas as vendas finalizadas já foram entregues.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingSales.map((sale) => {
              const client = sale.clients;
              const address = [client?.street, client?.number, client?.neighborhood, client?.city]
                .filter(Boolean)
                .join(", ");

              return (
                <Card key={sale.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(sale.id)}
                        onCheckedChange={() => toggleSelect(sale.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">#{sale.sale_number}</span>
                          <span className="font-bold text-primary">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{client?.full_name || "—"}</span>
                        </div>
                        {address && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{address}</span>
                          </div>
                        )}
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSingleDelivery(sale.id)}
                            disabled={isCalculating}
                          >
                            <Navigation className="h-3.5 w-3.5 mr-1.5" />
                            Entregar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
