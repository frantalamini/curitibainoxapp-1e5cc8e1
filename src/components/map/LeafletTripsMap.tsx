import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ServiceCallTrip } from "@/hooks/useServiceCallTrips";

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
  if (minutesAgo < 5) return "Ativo";
  if (minutesAgo < 30) return "Desatualizado";
  return "Sem sinal";
};

const formatTimeAgo = (iso: string) => {
  const minutesAgo = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutesAgo <= 0) return "agora";
  if (minutesAgo === 1) return "há 1 min";
  if (minutesAgo < 60) return `há ${minutesAgo} min`;
  const hours = Math.round(minutesAgo / 60);
  return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
};

interface LeafletTripsMapProps {
  trips: ServiceCallTrip[];
  className?: string;
}

export const LeafletTripsMap = ({ trips, className }: LeafletTripsMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFitBoundsRef = useRef(false);

  const validTrips = useMemo(
    () =>
      trips
        .map((t) => {
          const lat = t.current_lat ?? t.origin_lat;
          const lng = t.current_lng ?? t.origin_lng;
          return lat && lng ? { trip: t, lat, lng } : null;
        })
        .filter(Boolean) as Array<{ trip: ServiceCallTrip; lat: number; lng: number }>,
    [trips]
  );

  // init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Centro inicial: Curitiba
    const defaultCenter: [number, number] = [-25.4284, -49.2733];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  // update markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    validTrips.forEach(({ trip, lat, lng }) => {
      const updateTime = trip.position_updated_at || trip.started_at;

      const html = `
        <div style="min-width:220px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">
            ${trip.technicians?.full_name ?? "Técnico"}
          </div>
          <div style="display:inline-block;padding:2px 8px;border-radius:999px;background:#111827;color:#fff;font-size:12px;margin-bottom:8px;">
            ${getStatusLabel(trip)}
          </div>
          <div style="font-size:13px;line-height:1.35;">
            <div><strong>OS</strong> #${trip.service_calls?.os_number ?? "-"}</div>
            <div style="opacity:.8;">Cliente: ${trip.service_calls?.clients?.full_name ?? "-"}</div>
            <div style="opacity:.8;">Veículo: ${trip.vehicles?.name ?? "-"} - ${trip.vehicles?.plate ?? "-"}</div>
            ${
              trip.estimated_distance_km
                ? `<div style="opacity:.8;">Distância: ${trip.estimated_distance_km.toFixed(1)} km</div>`
                : ""
            }
            <div style="opacity:.7;font-size:12px;margin-top:6px;">Atualizado ${formatTimeAgo(updateTime)}</div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: getMarkerIcon(trip),
      }).bindPopup(html);

      marker.addTo(markersLayer);
    });

    if (!hasFitBoundsRef.current && validTrips.length > 0) {
      const bounds = L.latLngBounds(validTrips.map((t) => [t.lat, t.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50] });
      hasFitBoundsRef.current = true;
    }
  }, [validTrips]);

  return <div ref={containerRef} className={className} />;
};
