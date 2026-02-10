import { haversineDistance, type GeoCoordinates } from "./geoUtils";

export interface DeliveryStop {
  id: string; // sale_id
  coords: GeoCoordinates;
  label: string; // client name or address
}

export interface OptimizedRoute {
  stops: DeliveryStop[];
  totalDistanceKm: number;
  legDistances: number[]; // distance between each consecutive pair
}

/**
 * Nearest-neighbor route optimizer.
 * Given the driver's current position and a list of delivery stops,
 * returns the stops in an optimized order minimizing total travel distance.
 */
export function optimizeRoute(
  currentPosition: GeoCoordinates,
  stops: DeliveryStop[]
): OptimizedRoute {
  if (stops.length === 0) {
    return { stops: [], totalDistanceKm: 0, legDistances: [] };
  }

  if (stops.length === 1) {
    const dist = haversineDistance(
      currentPosition.lat, currentPosition.lng,
      stops[0].coords.lat, stops[0].coords.lng
    );
    return { stops: [...stops], totalDistanceKm: dist, legDistances: [dist] };
  }

  const remaining = [...stops];
  const ordered: DeliveryStop[] = [];
  const legDistances: number[] = [];
  let totalDistance = 0;
  let current = currentPosition;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        current.lat, current.lng,
        remaining[i].coords.lat, remaining[i].coords.lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining[nearestIdx]);
    legDistances.push(nearestDist);
    totalDistance += nearestDist;
    current = remaining[nearestIdx].coords;
    remaining.splice(nearestIdx, 1);
  }

  return { stops: ordered, totalDistanceKm: totalDistance, legDistances };
}
