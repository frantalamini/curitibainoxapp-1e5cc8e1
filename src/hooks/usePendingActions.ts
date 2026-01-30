import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { 
  MessageCategory, 
  MessagePriority, 
  ServiceCallMessage 
} from "./useServiceCallMessages";

export interface PendingAction extends ServiceCallMessage {
  os_number: number;
  client_name: string;
  technician_name: string;
  service_call_status: string;
}

export type SLAStatus = 'overdue' | 'due_today' | 'on_track';

export const usePendingActions = (filters?: {
  category?: MessageCategory | null;
  priority?: MessagePriority | null;
  technicianId?: string | null;
  slaStatus?: SLAStatus | null;
}) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-actions", filters],
    queryFn: async () => {
      // Fetch pending messages (requires_action = true AND resolved_at IS NULL)
      let messagesQuery = supabase
        .from("service_call_messages")
        .select("*")
        .eq("requires_action", true)
        .is("resolved_at", null)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (filters?.category) {
        messagesQuery = messagesQuery.eq("category", filters.category);
      }
      if (filters?.priority) {
        messagesQuery = messagesQuery.eq("priority", filters.priority);
      }

      const { data: messages, error } = await messagesQuery;
      if (error) throw error;

      if (!messages.length) return [];

      // Fetch service call data
      const serviceCallIds = [...new Set(messages.map(m => m.service_call_id))];
      const { data: serviceCalls } = await supabase
        .from("service_calls")
        .select(`
          id, 
          os_number, 
          status,
          technician_id,
          clients!inner(full_name),
          technicians!inner(full_name)
        `)
        .in("id", serviceCallIds);

      // Filter by technician if specified
      let filteredServiceCalls = serviceCalls || [];
      if (filters?.technicianId) {
        filteredServiceCalls = filteredServiceCalls.filter(
          sc => sc.technician_id === filters.technicianId
        );
      }

      const validServiceCallIds = new Set(filteredServiceCalls.map(sc => sc.id));

      // Fetch author profiles
      const authorIds = [...new Set(messages.map(m => m.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", authorIds);

      // Fetch mentions
      const messageIds = messages.map(m => m.id);
      const { data: mentions } = await supabase
        .from("service_call_message_mentions")
        .select("*")
        .in("message_id", messageIds);

      // Fetch mentioned user profiles
      const mentionedUserIds = [...new Set((mentions || []).map(m => m.mentioned_user_id))];
      const { data: mentionedProfiles } = mentionedUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, phone")
            .in("user_id", mentionedUserIds)
        : { data: [] };

      // Combine and filter data
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const pendingActions: PendingAction[] = messages
        .filter(msg => validServiceCallIds.has(msg.service_call_id))
        .map(msg => {
          const serviceCall = filteredServiceCalls.find(sc => sc.id === msg.service_call_id);
          
          return {
            ...msg,
            priority: msg.priority as MessagePriority,
            category: msg.category as MessageCategory | null,
            os_number: serviceCall?.os_number || 0,
            client_name: (serviceCall?.clients as any)?.full_name || 'N/A',
            technician_name: (serviceCall?.technicians as any)?.full_name || 'N/A',
            service_call_status: serviceCall?.status || 'unknown',
            author: profiles?.find(p => p.user_id === msg.author_id),
            mentions: (mentions || [])
              .filter(m => m.message_id === msg.id)
              .map(m => ({
                ...m,
                user: mentionedProfiles?.find(p => p.user_id === m.mentioned_user_id),
              })),
          };
        });

      // Filter by SLA status if specified
      if (filters?.slaStatus) {
        return pendingActions.filter(action => {
          const slaStatus = getSLAStatus(action.due_date);
          return slaStatus === filters.slaStatus;
        });
      }

      return pendingActions;
    },
  });

  // Realtime subscription for pending actions
  useEffect(() => {
    const channel = supabase
      .channel('pending-actions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_call_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// Count pending actions (for badge)
export const usePendingActionsCount = () => {
  return useQuery({
    queryKey: ["pending-actions-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("service_call_messages")
        .select("*", { count: 'exact', head: true })
        .eq("requires_action", true)
        .is("resolved_at", null);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Get overdue count (for urgent badge)
export const useOverdueActionsCount = () => {
  return useQuery({
    queryKey: ["overdue-actions-count"],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { count, error } = await supabase
        .from("service_call_messages")
        .select("*", { count: 'exact', head: true })
        .eq("requires_action", true)
        .is("resolved_at", null)
        .lt("due_date", now);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });
};

// Helper to determine SLA status
export const getSLAStatus = (dueDate: string | null): SLAStatus | null => {
  if (!dueDate) return null;
  
  const now = new Date();
  const due = new Date(dueDate);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  if (due < now) return 'overdue';
  if (due >= todayStart && due < todayEnd) return 'due_today';
  return 'on_track';
};

// Get SLA color class
export const getSLAColorClass = (status: SLAStatus | null): string => {
  switch (status) {
    case 'overdue':
      return 'text-destructive bg-destructive/10';
    case 'due_today':
      return 'text-orange-600 bg-orange-50';
    case 'on_track':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-muted-foreground';
  }
};

// Get SLA label
export const getSLALabel = (status: SLAStatus | null, dueDate: string | null): string => {
  if (!dueDate) return 'Sem prazo';
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  switch (status) {
    case 'overdue':
      if (diffDays < -1) return `Atrasado: ${Math.abs(diffDays)} dias`;
      if (diffHours < -1) return `Atrasado: ${Math.abs(diffHours)}h`;
      return 'Atrasado';
    case 'due_today':
      if (diffHours > 0) return `Vence em ${diffHours}h`;
      return 'Vence hoje';
    case 'on_track':
      if (diffDays > 0) return `Em ${diffDays} dias`;
      return `Em ${diffHours}h`;
    default:
      return 'Sem prazo';
  }
};
