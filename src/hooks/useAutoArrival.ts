import { useEffect, useRef, useState, useCallback } from "react";
import type { ServiceCallTrip } from "@/hooks/useServiceCallTrips";

const COUNTDOWN_SECONDS = 600; // 10 minutos
const SNOOZE_SECONDS = 300; // 5 minutos

interface UseAutoArrivalParams {
  nearDestination: boolean;
  activeTrip: ServiceCallTrip | null | undefined;
  onAutoArrive: () => void;
}

interface UseAutoArrivalResult {
  arrivalDetected: boolean;
  countdownSeconds: number;
  confirm: () => void;
  dismiss: () => void;
}

export function useAutoArrival({
  nearDestination,
  activeTrip,
  onAutoArrive,
}: UseAutoArrivalParams): UseAutoArrivalResult {
  const [arrivalDetected, setArrivalDetected] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_SECONDS);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoArriveRef = useRef(onAutoArrive);

  autoArriveRef.current = onAutoArrive;

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
      snoozeTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setArrivalDetected(false);
    setCountdownSeconds(COUNTDOWN_SECONDS);
    setDismissed(false);
  }, [clearTimers]);

  const isValidTrip =
    activeTrip &&
    activeTrip.status === "em_deslocamento" &&
    activeTrip.trip_type !== "interno";

  useEffect(() => {
    if (!isValidTrip) {
      reset();
      return;
    }
  }, [isValidTrip, reset]);

  useEffect(() => {
    if (!isValidTrip || dismissed) return;

    if (nearDestination && !arrivalDetected) {
      setArrivalDetected(true);
      setCountdownSeconds(COUNTDOWN_SECONDS);
    }
  }, [nearDestination, isValidTrip, dismissed, arrivalDetected]);

  useEffect(() => {
    if (!arrivalDetected || dismissed) {
      clearTimers();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearTimers();
          autoArriveRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [arrivalDetected, dismissed, clearTimers]);

  const confirm = useCallback(() => {
    clearTimers();
    autoArriveRef.current();
  }, [clearTimers]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setArrivalDetected(false);
    clearTimers();

    snoozeTimeoutRef.current = setTimeout(() => {
      setDismissed(false);
    }, SNOOZE_SECONDS * 1000);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    arrivalDetected: arrivalDetected && !dismissed,
    countdownSeconds,
    confirm,
    dismiss,
  };
}
