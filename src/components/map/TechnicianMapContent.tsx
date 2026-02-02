import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCallTrip } from "@/hooks/useServiceCallTrips";
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

interface TechnicianMapContentProps {
  trips: ServiceCallTrip[];
}

const TechnicianMapContent = ({ trips }: TechnicianMapContentProps) => {
  // Centro inicial: Curitiba
  const defaultCenter: [number, number] = [-25.4284, -49.2733];
  
  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapBounds trips={trips} />
      
      {trips.map((trip) => {
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
  );
};

export default TechnicianMapContent;
