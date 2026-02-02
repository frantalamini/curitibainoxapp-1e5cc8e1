import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface MentionNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: {
    service_call_id?: string;
    os_number?: number;
    message_id?: string;
    author_name?: string;
  };
  read_at: string | null;
  created_at: string;
}

export const useMentionNotifications = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const previousNotificationsRef = useRef<string[]>([]);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime subscription for instant notifications
  useEffect(() => {
    if (!userId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`mention-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as MentionNotification;
          
          // Show toast for new mention
          if (newNotification.type === 'mention') {
            toast({
              title: newNotification.title,
              description: newNotification.body || undefined,
            });
          }

          // Invalidate cache to update list
          queryClient.invalidateQueries({
            queryKey: ['mention-notifications', userId]
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient, navigate]);

  // Query notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["mention-notifications", userId],
    queryFn: async (): Promise<MentionNotification[]> => {
      if (!userId) return [];

      // Fetch notifications from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "mention")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching mention notifications:", error);
        return [];
      }

      return (data || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        metadata: n.metadata || {},
        read_at: n.read_at,
        created_at: n.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Fallback polling every minute
  });

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (!error) {
      queryClient.invalidateQueries({
        queryKey: ['mention-notifications', userId]
      });
    }
  }, [userId, queryClient]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .eq("user_id", userId);

    if (!error) {
      queryClient.invalidateQueries({
        queryKey: ['mention-notifications', userId]
      });
    }
  }, [userId, notifications, queryClient]);

  // Navigate to notification link
  const goToNotification = useCallback((notification: MentionNotification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }, [markAsRead, navigate]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    goToNotification,
  };
};
