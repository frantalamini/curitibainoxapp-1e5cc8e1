import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTechnician } from "./useCurrentTechnician";

const STORAGE_KEY = "notifications_read_ids";
const MAX_AGE_DAYS = 7;

export interface Notification {
  id: string;
  os_number: number;
  client_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status_name: string;
  status_color: string;
  created_at: string;
  seen_by_tech_at: string | null;
}

const getReadIds = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    
    // Limpar IDs antigos (mais de 7 dias)
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const filtered = Object.entries(parsed)
      .filter(([_, timestamp]) => now - (timestamp as number) < maxAge)
      .reduce((acc, [id, ts]) => ({ ...acc, [id]: ts }), {});
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return Object.keys(filtered);
  } catch {
    return [];
  }
};

const saveReadId = (id: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed[id] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors
  }
};

const saveAllReadIds = (ids: string[]) => {
  try {
    const now = Date.now();
    const parsed = ids.reduce((acc, id) => ({ ...acc, [id]: now }), {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors
  }
};

export const useNotifications = () => {
  const { technicianId, isLoading: isTechnicianLoading } = useCurrentTechnician();
  const queryClient = useQueryClient();
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read IDs on mount
  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["technician-notifications", technicianId],
    queryFn: async (): Promise<Notification[]> => {
      if (!technicianId) return [];

      // Buscar chamados não vistos OU criados nas últimas 48h
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      const { data, error } = await supabase
        .from("service_calls")
        .select(`
          id,
          os_number,
          scheduled_date,
          scheduled_time,
          created_at,
          seen_by_tech_at,
          clients (full_name),
          service_call_statuses (name, color)
        `)
        .eq("technician_id", technicianId)
        .or(`seen_by_tech_at.is.null,created_at.gte.${twoDaysAgo.toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Erro ao buscar notificações:", error);
        return [];
      }

      return (data || []).map((call: any) => ({
        id: call.id,
        os_number: call.os_number,
        client_name: call.clients?.full_name || "Cliente",
        scheduled_date: call.scheduled_date,
        scheduled_time: call.scheduled_time,
        status_name: call.service_call_statuses?.name || "Pendente",
        status_color: call.service_call_statuses?.color || "#6b7280",
        created_at: call.created_at,
        seen_by_tech_at: call.seen_by_tech_at,
      }));
    },
    enabled: !isTechnicianLoading && !!technicianId,
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refetch a cada minuto
  });

  // Filtrar apenas não lidas (não vistas pelo técnico E não marcadas como lidas localmente)
  const unreadNotifications = notifications.filter(
    (n) => !n.seen_by_tech_at && !readIds.includes(n.id)
  );

  const unreadCount = unreadNotifications.length;

  const markAsRead = useCallback((id: string) => {
    saveReadId(id);
    setReadIds((prev) => [...prev, id]);
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    saveAllReadIds(allIds);
    setReadIds(allIds);
  }, [notifications]);

  const isRead = useCallback((id: string) => {
    const notification = notifications.find((n) => n.id === id);
    return notification?.seen_by_tech_at || readIds.includes(id);
  }, [notifications, readIds]);

  return {
    notifications,
    unreadCount,
    isLoading: isLoading || isTechnicianLoading,
    markAsRead,
    markAllAsRead,
    isRead,
  };
};
