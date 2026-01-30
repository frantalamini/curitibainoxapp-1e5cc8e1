import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCategory } from "./useServiceCallMessages";

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: MessageCategory | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const useMessageTemplates = () => {
  return useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return data.map((t): MessageTemplate => ({
        ...t,
        category: t.category as MessageCategory | null,
      }));
    },
  });
};

// Template icons based on category
export const TEMPLATE_ICONS: Record<string, string> = {
  part_request: "🔧",
  quote_pending: "💰",
  approval_needed: "⏳",
  schedule_change: "📅",
  default: "📝",
};
