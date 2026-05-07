import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  watchCurrentPosition,
  clearPositionWatch,
  haversineDistance,
  GeoCoordinates,
} from "@/lib/geoUtils";
import type { ServiceCallTrip } from "@/hooks/useServiceCallTrips";

const THROTTLE_MS = 30000;
const PROXIMITY_THRESHOLD_KM = 0.2;

export interface GpsTrackingResult {
  nearDestination: boolean;
  distanceToDestination: number | null;
}

export function useGpsTracking(
  activeTrip: ServiceCallTrip | null | undefined,
): GpsTrackingResult {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const tripIdRef = useRef<string | null>(null);
  const [nearDestination, setNearDestination] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState<
    number | null
  >(null);

  const checkProximity = useCallback(
    (coords: GeoCoordinates) => {
      if (
        !activeTrip?.destination_lat ||
        !activeTrip?.destination_lng ||
        activeTrip.trip_type === "interno"
      ) {
        return;
      }

      const distance = haversineDistance(
        coords.lat,
        coords.lng,
        activeTrip.destination_lat,
        activeTrip.destination_lng,
      );

      setDistanceToDestination(distance);
      setNearDestination(distance <= PROXIMITY_THRESHOLD_KM);
    },
    [
      activeTrip?.destination_lat,
      activeTrip?.destination_lng,
      activeTrip?.trip_type,
    ],
  );

  const updatePosition = useCallback(
    async (coords: GeoCoordinates) => {
      const tripId = tripIdRef.current;
      if (!tripId) return;

      checkProximity(coords);

      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;

      if (elapsed < THROTTLE_MS) {
        return;
      }

      lastUpdateRef.current = now;

      try {
        const { error } = await supabase
          .from("service_call_trips")
          .update({
            current_lat: coords.lat,
            current_lng: coords.lng,
            position_updated_at: new Date().toISOString(),
          })
          .eq("id", tripId);

        if (error) {
          console.warn(
            "[GPS Tracking] Erro ao atualizar posição:",
            error.message,
          );
        }
      } catch (err) {
        console.warn("[GPS Tracking] Exceção ao atualizar posição:", err);
      }
    },
    [checkProximity],
  );

  useEffect(() => {
    if (
      !activeTrip ||
      activeTrip.status !== "em_deslocamento" ||
      activeTrip.trip_type === "interno"
    ) {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
        tripIdRef.current = null;
      }
      setNearDestination(false);
      setDistanceToDestination(null);
      return;
    }

    if (tripIdRef.current === activeTrip.id && watchIdRef.current !== null) {
      return;
    }

    tripIdRef.current = activeTrip.id;
    lastUpdateRef.current = 0;

    const watchId = watchCurrentPosition(
      (coords) => {
        updatePosition(coords);
      },
      (error) => {
        console.warn("[GPS Tracking] Erro GPS:", error.code, error.message);
      },
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeTrip?.id, activeTrip?.status, updatePosition]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
        tripIdRef.current = null;
      }
    };
  }, []);

  return { nearDestination, distanceToDestination };
}
