import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Loader2, Navigation, Clock, AlertCircle } from "lucide-react";
import { useServiceCallTrips, ServiceCallTrip } from "@/hooks/useServiceCallTrips";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix para ícones do Leaflet no Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Ícones coloridos customizados
const createColoredIcon = (color: string) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path fill="${color}" stroke="#333" stroke-width="1" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z"/>
      <circle fill="white" cx="12" cy="12" r="5"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
};

const greenIcon = createColoredIcon("#22c55e");
const yellowIcon = createColoredIcon("#eab308");
const grayIcon = createColoredIcon("#6b7280");

// Componente para centralizar o mapa quando há marcadores
const MapBounds = ({ trips }: { trips: ServiceCallTrip[] }) => {
  const map = useMap();
  
  useEffect(() => {
    const validTrips = trips.filter(t => t.origin_lat && t.origin_lng);
    if (validTrips.length > 0) {
      const bounds = L.latLngBounds(
        validTrips.map(t => [t.origin_lat!, t.origin_lng!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [trips, map]);
  
  return null;
};

const TechnicianMap = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Buscar apenas viagens em deslocamento
  const { data: activeTrips, isLoading, refetch } = useServiceCallTrips();
  
  // Filtrar apenas trips em deslocamento com coordenadas
  const tripsEmDeslocamento = activeTrips?.filter(
    t => t.status === "em_deslocamento"
  ) || [];
  
  // Configurar realtime para atualizações
  useEffect(() => {
    const channel = supabase
      .channel("trips-map-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_call_trips",
        },
        () => {
          refetch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };
  
  // Determinar cor do marcador baseado no tempo da última atualização
  const getMarkerIcon = (trip: ServiceCallTrip) => {
    const updateTime = trip.position_updated_at || trip.started_at;
    const minutesAgo = (Date.now() - new Date(updateTime).getTime()) / 60000;
    
    if (minutesAgo < 5) return greenIcon;
    if (minutesAgo < 30) return yellowIcon;
    return grayIcon;
  };
  
  const getStatusLabel = (trip: ServiceCallTrip) => {
    const updateTime = trip.position_updated_at || trip.started_at;
    const minutesAgo = (Date.now() - new Date(updateTime).getTime()) / 60000;
    
    if (minutesAgo < 5) return { label: "Ativo", color: "bg-green-500" };
    if (minutesAgo < 30) return { label: "Desatualizado", color: "bg-yellow-500" };
    return { label: "Sem sinal", color: "bg-gray-500" };
  };
  
  // Centro inicial: Curitiba
  const defaultCenter: [number, number] = [-25.4284, -49.2733];
  
  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Navigation className="h-8 w-8 flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Mapa de Técnicos</h1>
              <p className="text-sm text-muted-foreground">
                {tripsEmDeslocamento.length} técnico(s) em deslocamento
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
        
        {/* Legenda */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span>Ativo (atualizado há menos de 5 min)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span>Desatualizado (5-30 min)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500" />
                <span>Sem sinal (mais de 30 min)</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Mapa */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px] bg-muted">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : tripsEmDeslocamento.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] bg-muted text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Nenhum técnico em deslocamento</p>
                <p className="text-sm">Os técnicos aparecerão aqui quando iniciarem um deslocamento</p>
              </div>
            ) : (
              <div className="h-[500px]">
                <MapContainer
                  center={defaultCenter}
                  zoom={12}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <MapBounds trips={tripsEmDeslocamento} />
                  
                  {tripsEmDeslocamento.map((trip) => {
                    // Usar origin_lat/lng (posição inicial) ou current_lat/lng se disponível
                    const lat = trip.current_lat || trip.origin_lat;
                    const lng = trip.current_lng || trip.origin_lng;
                    
                    if (!lat || !lng) return null;
                    
                    const status = getStatusLabel(trip);
                    const updateTime = trip.position_updated_at || trip.started_at;
                    
                    return (
                      <Marker
                        key={trip.id}
                        position={[lat, lng]}
                        icon={getMarkerIcon(trip)}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <div className="font-bold text-base mb-2">
                              {trip.technicians?.full_name || "Técnico"}
                            </div>
                            
                            <Badge className={`${status.color} mb-2`}>
                              {status.label}
                            </Badge>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  OS #{trip.service_calls?.os_number}
                                </span>
                              </div>
                              
                              <div className="text-muted-foreground">
                                Cliente: {trip.service_calls?.clients?.full_name}
                              </div>
                              
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span>🚗</span>
                                <span>
                                  {trip.vehicles?.name} - {trip.vehicles?.plate}
                                </span>
                              </div>
                              
                              {trip.estimated_distance_km && (
                                <div className="text-muted-foreground">
                                  Distância: {trip.estimated_distance_km.toFixed(1)} km
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatDistanceToNow(new Date(updateTime), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Lista de técnicos em deslocamento */}
        {tripsEmDeslocamento.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Técnicos em Campo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tripsEmDeslocamento.map((trip) => {
                  const status = getStatusLabel(trip);
                  const updateTime = trip.position_updated_at || trip.started_at;
                  
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <div>
                          <div className="font-medium">
                            {trip.technicians?.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            OS #{trip.service_calls?.os_number} • {trip.vehicles?.plate}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        <div className="text-muted-foreground">
                          {formatDistanceToNow(new Date(updateTime), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        {trip.estimated_distance_km && (
                          <div className="font-medium">
                            {trip.estimated_distance_km.toFixed(1)} km
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default TechnicianMap;
