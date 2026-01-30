import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type MessageCategory = 
  | 'part_request' 
  | 'quote_pending' 
  | 'approval_needed' 
  | 'info_needed' 
  | 'schedule_change' 
  | 'other';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ServiceCallMessage {
  id: string;
  service_call_id: string;
  author_id: string;
  content: string;
  category: MessageCategory | null;
  priority: MessagePriority;
  requires_action: boolean;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    full_name: string;
    phone?: string;
  };
  mentions?: MessageMention[];
  attachments?: MessageAttachment[];
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  notified_via_whatsapp: boolean;
  seen_at: string | null;
  created_at: string;
  // Joined data
  user?: {
    full_name: string;
    phone?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'document' | 'audio';
  file_size: number | null;
  file_path?: string | null;
  created_at: string;
}

export interface CreateMessageInput {
  service_call_id: string;
  content: string;
  category?: MessageCategory | null;
  priority?: MessagePriority;
  requires_action?: boolean;
  due_date?: string | null;
  mentioned_user_ids?: string[];
  attachments?: {
    file_url: string;
    file_name: string;
    file_type: 'image' | 'document' | 'audio';
    file_size?: number;
    file_path?: string;
  }[];
}

// Fetch messages for a service call
export const useServiceCallMessages = (serviceCallId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["service-call-messages", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return [];

      // Fetch messages
      const { data: messages, error } = await supabase
        .from("service_call_messages")
        .select("*")
        .eq("service_call_id", serviceCallId)
        .order("created_at", { ascending: true });

      if (error) throw error;

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

      // Fetch attachments
      const { data: attachments } = await supabase
        .from("service_call_message_attachments")
        .select("*")
        .in("message_id", messageIds);

      // Combine data
      return messages.map((msg): ServiceCallMessage => ({
        ...msg,
        priority: msg.priority as MessagePriority,
        category: msg.category as MessageCategory | null,
        author: profiles?.find(p => p.user_id === msg.author_id),
        mentions: (mentions || [])
          .filter(m => m.message_id === msg.id)
          .map(m => ({
            ...m,
            user: mentionedProfiles?.find(p => p.user_id === m.mentioned_user_id),
          })),
        attachments: (attachments || [])
          .filter(a => a.message_id === msg.id)
          .map(a => ({
            ...a,
            file_type: a.file_type as 'image' | 'document' | 'audio',
          })),
      }));
    },
    enabled: !!serviceCallId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!serviceCallId) return;

    const channel = supabase
      .channel(`service-call-messages-${serviceCallId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_call_messages',
          filter: `service_call_id=eq.${serviceCallId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["service-call-messages", serviceCallId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceCallId, queryClient]);

  return query;
};

// Create a new message
export const useCreateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create message
      const { data: message, error: msgError } = await supabase
        .from("service_call_messages")
        .insert({
          service_call_id: input.service_call_id,
          author_id: user.id,
          content: input.content,
          category: input.category || null,
          priority: input.priority || 'normal',
          requires_action: input.requires_action || false,
          due_date: input.due_date || null,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Create mentions
      if (input.mentioned_user_ids && input.mentioned_user_ids.length > 0) {
        const mentionsToInsert = input.mentioned_user_ids.map(userId => ({
          message_id: message.id,
          mentioned_user_id: userId,
        }));

        const { error: mentionsError } = await supabase
          .from("service_call_message_mentions")
          .insert(mentionsToInsert);

        if (mentionsError) console.error("Erro ao criar menções:", mentionsError);
      }

      // Create attachments
      if (input.attachments && input.attachments.length > 0) {
        const attachmentsToInsert = input.attachments.map(att => ({
          message_id: message.id,
          file_url: att.file_url || '',
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size || null,
          file_path: att.file_path || null,
        }));

        const { error: attError } = await supabase
          .from("service_call_message_attachments")
          .insert(attachmentsToInsert);

        if (attError) console.error("Erro ao criar anexos:", attError);
      }

      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-call-messages", variables.service_call_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Resolve a pending action
export const useResolveMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      messageId, 
      resolutionNotes 
    }: { 
      messageId: string; 
      resolutionNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("service_call_messages")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-messages"] });
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
      toast({
        title: "Pendência resolvida",
        description: "A pendência foi marcada como resolvida.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resolver pendência",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Mark mention as seen
export const useMarkMentionSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from("service_call_message_mentions")
        .update({ seen_at: new Date().toISOString() })
        .eq("id", mentionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-messages"] });
      queryClient.invalidateQueries({ queryKey: ["unread-mentions"] });
    },
  });
};

// Delete message (only for gerencial)
export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("service_call_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-call-messages"] });
      queryClient.invalidateQueries({ queryKey: ["pending-actions"] });
      toast({
        title: "Mensagem excluída",
        description: "A mensagem foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Category labels
export const CATEGORY_LABELS: Record<MessageCategory, string> = {
  part_request: "Peça Necessária",
  quote_pending: "Orçamento Pendente",
  approval_needed: "Aprovação Gerencial",
  info_needed: "Informação Adicional",
  schedule_change: "Reagendamento",
  other: "Outros",
};

// Category icons
export const CATEGORY_ICONS: Record<MessageCategory, string> = {
  part_request: "🔧",
  quote_pending: "💰",
  approval_needed: "✅",
  info_needed: "ℹ️",
  schedule_change: "📅",
  other: "📝",
};

// Priority labels
export const PRIORITY_LABELS: Record<MessagePriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

// Priority colors
export const PRIORITY_COLORS: Record<MessagePriority, string> = {
  low: "text-muted-foreground",
  normal: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-destructive",
};

// Default SLA hours by priority
export const DEFAULT_SLA_HOURS: Record<MessagePriority, number> = {
  low: 72,
  normal: 24,
  high: 8,
  urgent: 2,
};
