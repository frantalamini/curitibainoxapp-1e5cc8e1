import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { watchCurrentPosition, clearPositionWatch, GeoCoordinates } from "@/lib/geoUtils";
import type { ServiceCallTrip } from "@/hooks/useServiceCallTrips";

const THROTTLE_MS = 30000; // 30 segundos entre updates

/**
 * Hook para rastrear posição GPS automaticamente durante deslocamento ativo.
 * Atualiza current_lat, current_lng e position_updated_at na tabela service_call_trips.
 * 
 * @param activeTrip - Deslocamento em aberto (status = 'em_deslocamento')
 */
export function useGpsTracking(activeTrip: ServiceCallTrip | null | undefined) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const tripIdRef = useRef<string | null>(null);

  // Atualiza posição no banco com throttle
  const updatePosition = useCallback(async (coords: GeoCoordinates) => {
    const tripId = tripIdRef.current;
    if (!tripId) return;

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    // Throttle: só atualiza se passou tempo suficiente
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
        console.warn("[GPS Tracking] Erro ao atualizar posição:", error.message);
      } else {
        console.log("[GPS Tracking] Posição atualizada:", coords.lat.toFixed(6), coords.lng.toFixed(6));
      }
    } catch (err) {
      console.warn("[GPS Tracking] Exceção ao atualizar posição:", err);
    }
  }, []);

  // Inicia/para tracking baseado no activeTrip
  useEffect(() => {
    // Se não tem trip ativo, limpa tudo
    if (!activeTrip || activeTrip.status !== "em_deslocamento") {
      if (watchIdRef.current !== null) {
        console.log("[GPS Tracking] Parando rastreamento (trip encerrado ou inexistente)");
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
        tripIdRef.current = null;
      }
      return;
    }

    // Se já está rastreando esse trip, não faz nada
    if (tripIdRef.current === activeTrip.id && watchIdRef.current !== null) {
      return;
    }

    // Inicia rastreamento para novo trip
    console.log("[GPS Tracking] Iniciando rastreamento para trip:", activeTrip.id);
    tripIdRef.current = activeTrip.id;
    lastUpdateRef.current = 0; // Força update imediato na primeira posição

    const watchId = watchCurrentPosition(
      (coords) => {
        updatePosition(coords);
      },
      (error) => {
        // Erro silencioso - só log para debug
        console.warn("[GPS Tracking] Erro GPS:", error.code, error.message);
      }
    );

    watchIdRef.current = watchId;

    // Cleanup ao desmontar ou quando activeTrip mudar
    return () => {
      if (watchIdRef.current !== null) {
        console.log("[GPS Tracking] Cleanup - parando rastreamento");
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeTrip?.id, activeTrip?.status, updatePosition]);

  // Cleanup final quando componente desmonta
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
        tripIdRef.current = null;
      }
    };
  }, []);
}
