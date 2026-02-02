/**
 * Utilitários de Geolocalização
 * Funções para cálculo de distância e captura de posição GPS
 */

/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lng1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lng2 Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Converte graus para radianos
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Interface para coordenadas geográficas
 */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/**
 * Interface para endereço do cliente
 */
export interface ClientAddress {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}

/**
 * Obtém a posição atual do dispositivo via GPS
 * @param options Opções de geolocalização
 * @returns Promise com as coordenadas
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada pelo navegador"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let message = "Erro ao obter localização";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Permissão de localização negada. Por favor, habilite o GPS nas configurações.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Localização indisponível. Verifique se o GPS está ativado.";
            break;
          case error.TIMEOUT:
            message = "Tempo esgotado ao buscar localização. Tente novamente.";
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options,
      }
    );
  });
}

/**
 * Callback para atualizações de posição
 */
export type PositionCallback = (coords: GeoCoordinates) => void;
export type PositionErrorCallback = (error: GeolocationPositionError) => void;

/**
 * Inicia o monitoramento contínuo de posição GPS
 * @param onPosition Callback chamado a cada atualização de posição
 * @param onError Callback chamado em caso de erro (opcional)
 * @param options Opções de geolocalização
 * @returns ID do watcher para cancelamento posterior
 */
export function watchCurrentPosition(
  onPosition: PositionCallback,
  onError?: PositionErrorCallback,
  options?: PositionOptions
): number | null {
  if (!navigator.geolocation) {
    console.warn("[GPS] Geolocalização não suportada pelo navegador");
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      console.warn("[GPS] Erro no watchPosition:", error.message);
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000, // Aceita posição com até 10s de idade
      ...options,
    }
  );

  return watchId;
}

/**
 * Para o monitoramento de posição GPS
 * @param watchId ID retornado por watchCurrentPosition
 */
export function clearPositionWatch(watchId: number | null): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Verifica se a API de geolocalização está disponível
 */
export function isGeolocationAvailable(): boolean {
  return "geolocation" in navigator;
}

/**
 * Formata coordenadas para exibição
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Formata distância para exibição
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Constrói string de endereço a partir dos componentes
 */
export function buildAddressString(address: ClientAddress): string {
  const parts = [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.cep,
  ].filter(Boolean);
  
  return parts.join(", ");
}

/**
 * Calcula tempo estimado de viagem baseado na distância
 * @param distanceKm Distância em km
 * @param avgSpeedKmh Velocidade média em km/h (padrão: 30 km/h para trânsito urbano)
 * @returns Tempo estimado em minutos
 */
export function estimateTravelTime(
  distanceKm: number,
  avgSpeedKmh: number = 30
): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Formata tempo de viagem para exibição
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
