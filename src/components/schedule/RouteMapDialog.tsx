import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Loader2,
  Navigation,
  MapPin,
  Clock,
  Route,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentPosition,
  buildAddressString,
  formatDistance,
  estimateTravelTime,
  formatTravelTime,
  type GeoCoordinates,
} from "@/lib/geoUtils";
import { optimizeRoute, type DeliveryStop } from "@/lib/routeOptimizer";
import "leaflet/dist/leaflet.css";

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

const createNumberedIcon = (num: number, color: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
      <path fill="${color}" stroke="#333" stroke-width="1.5" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 28 16 28s16-16 16-28C32 7.2 24.8 0 16 0z"/>
      <circle fill="white" cx="16" cy="15" r="10"/>
      <text x="16" y="19" text-anchor="middle" font-size="12" font-weight="bold" fill="${color}" font-family="Arial">${num}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  });
};

const originIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
      <path fill="#22c55e" stroke="#333" stroke-width="1.5" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 28 16 28s16-16 16-28C32 7.2 24.8 0 16 0z"/>
      <circle fill="white" cx="16" cy="15" r="10"/>
      <text x="16" y="20" text-anchor="middle" font-size="16" font-weight="bold" fill="#22c55e" font-family="Arial">★</text>
    </svg>
  `,
  className: "custom-marker",
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44],
});

interface ServiceCallForRoute {
  id: string;
  os_number: number;
  scheduled_time: string;
  equipment_description: string;
  status: string;
  clients?: {
    full_name: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    nome_fantasia?: string;
  } | null;
}

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCalls: ServiceCallForRoute[];
  technicianName: string;
}

interface GeocodedStop {
  call: ServiceCallForRoute;
  coords: GeoCoordinates;
  address: string;
}

function FitBounds({ points }: { points: GeoCoordinates[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.lat, p.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

const RouteMapDialog = ({
  open,
  onOpenChange,
  serviceCalls,
  technicianName,
}: RouteMapDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<GeoCoordinates | null>(null);
  const [geocodedStops, setGeocodedStops] = useState<GeocodedStop[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<DeliveryStop[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [legDistances, setLegDistances] = useState<number[]>([]);
  const [calculated, setCalculated] = useState(false);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setOrigin(null);
    setGeocodedStops([]);
    setOptimizedStops([]);
    setTotalDistance(0);
    setLegDistances([]);
    setCalculated(false);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const calculateRoute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let currentPos: GeoCoordinates;
      try {
        currentPos = await getCurrentPosition();
      } catch {
        currentPos = { lat: -25.4284, lng: -49.2733 };
      }
      setOrigin(currentPos);

      const geocoded: GeocodedStop[] = [];

      for (const call of serviceCalls) {
        const client = call.clients;
        if (!client || (!client.street && !client.city && !client.cep))
          continue;

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
            geocoded.push({
              call,
              coords: { lat: data.lat, lng: data.lng },
              address: buildAddressString({
                street: client.street,
                number: client.number,
                neighborhood: client.neighborhood,
                city: client.city,
                state: client.state,
              }),
            });
          }
        } catch {
          // skip failed geocoding
        }
      }

      if (geocoded.length === 0) {
        setError(
          "Nenhum endereço pôde ser geocodificado. Verifique se os clientes possuem endereço cadastrado.",
        );
        setLoading(false);
        return;
      }

      setGeocodedStops(geocoded);

      const stops: DeliveryStop[] = geocoded.map((g) => ({
        id: g.call.id,
        coords: g.coords,
        label:
          g.call.clients?.nome_fantasia ||
          g.call.clients?.full_name ||
          "Cliente",
      }));

      const result = optimizeRoute(currentPos, stops);
      setOptimizedStops(result.stops);
      setTotalDistance(result.totalDistanceKm);
      setLegDistances(result.legDistances);
      setCalculated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao calcular a rota");
    } finally {
      setLoading(false);
    }
  }, [serviceCalls]);

  const orderedGeocodedStops = useMemo(() => {
    if (!optimizedStops.length) return geocodedStops;
    return optimizedStops.map(
      (stop) => geocodedStops.find((g) => g.call.id === stop.id)!,
    );
  }, [optimizedStops, geocodedStops]);

  const allMapPoints = useMemo(() => {
    const points: GeoCoordinates[] = [];
    if (origin) points.push(origin);
    orderedGeocodedStops.forEach((s) => points.push(s.coords));
    return points;
  }, [origin, orderedGeocodedStops]);

  const routePolyline = useMemo(() => {
    if (!origin || !orderedGeocodedStops.length) return [];
    return [
      [origin.lat, origin.lng] as [number, number],
      ...orderedGeocodedStops.map(
        (s) => [s.coords.lat, s.coords.lng] as [number, number],
      ),
    ];
  }, [origin, orderedGeocodedStops]);

  const openGoogleMaps = useCallback(() => {
    if (!origin || !orderedGeocodedStops.length) return;

    const last = orderedGeocodedStops[orderedGeocodedStops.length - 1];
    const waypoints = orderedGeocodedStops
      .slice(0, -1)
      .map((s) => `${s.coords.lat},${s.coords.lng}`)
      .join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${last.coords.lat},${last.coords.lng}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    url += "&travelmode=driving";

    window.open(url, "_blank");
  }, [origin, orderedGeocodedStops]);

  const openWaze = useCallback(() => {
    if (!orderedGeocodedStops.length) return;
    const first = orderedGeocodedStops[0];
    window.open(
      `https://waze.com/ul?ll=${first.coords.lat},${first.coords.lng}&navigate=yes`,
      "_blank",
    );
  }, [orderedGeocodedStops]);

  const totalTime = estimateTravelTime(totalDistance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Rota do Dia — {technicianName}
          </DialogTitle>
        </DialogHeader>

        {!calculated && !loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <MapPin className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground text-center">
              {serviceCalls.length} chamado
              {serviceCalls.length !== 1 ? "s" : ""} agendado
              {serviceCalls.length !== 1 ? "s" : ""}
            </p>
            <Button onClick={calculateRoute} disabled={loading}>
              <Navigation className="h-4 w-4 mr-2" />
              Calcular Rota Otimizada
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Geocodificando endereços e calculando rota...
            </p>
          </div>
        )}

        {calculated && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-sm py-1 px-3">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {orderedGeocodedStops.length} parada
                {orderedGeocodedStops.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-sm py-1 px-3">
                <Route className="h-3.5 w-3.5 mr-1" />
                {formatDistance(totalDistance)}
              </Badge>
              <Badge variant="outline" className="text-sm py-1 px-3">
                <Clock className="h-3.5 w-3.5 mr-1" />~
                {formatTravelTime(totalTime)}
              </Badge>
            </div>

            {/* Map */}
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <MapContainer
                center={[-25.4284, -49.2733]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds points={allMapPoints} />

                {origin && (
                  <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
                    <Popup>
                      <strong>Ponto de partida</strong>
                    </Popup>
                  </Marker>
                )}

                {orderedGeocodedStops.map((stop, idx) => (
                  <Marker
                    key={stop.call.id}
                    position={[stop.coords.lat, stop.coords.lng]}
                    icon={createNumberedIcon(idx + 1, "#3b82f6")}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <div className="font-bold">
                          #{stop.call.os_number} —{" "}
                          {stop.call.clients?.nome_fantasia ||
                            stop.call.clients?.full_name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {stop.address}
                        </div>
                        <div className="text-xs mt-1">
                          {stop.call.scheduled_time} —{" "}
                          {stop.call.equipment_description}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {routePolyline.length > 1 && (
                  <Polyline
                    positions={routePolyline}
                    color="#3b82f6"
                    weight={3}
                    opacity={0.7}
                    dashArray="8 6"
                  />
                )}
              </MapContainer>
            </div>

            {/* Stops list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Ordem das paradas</h3>
              {orderedGeocodedStops.map((stop, idx) => (
                <div
                  key={stop.call.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      OS #{stop.call.os_number} —{" "}
                      {stop.call.clients?.nome_fantasia ||
                        stop.call.clients?.full_name}
                    </div>
                    <div className="text-muted-foreground text-xs truncate">
                      {stop.address}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {stop.call.scheduled_time}
                    {legDistances[idx] != null && (
                      <div>{formatDistance(legDistances[idx])}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={openGoogleMaps} className="flex-1 min-w-[180px]">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Google Maps
              </Button>
              <Button
                onClick={openWaze}
                variant="outline"
                className="flex-1 min-w-[180px]"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Abrir no Waze
              </Button>
              <Button variant="ghost" onClick={calculateRoute}>
                Recalcular
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RouteMapDialog;
