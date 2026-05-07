import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusLogEntry {
  id: string;
  service_call_id: string;
  field_changed: "status_id" | "commercial_status_id";
  old_status_name: string | null;
  new_status_name: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export const useServiceCallStatusLog = (serviceCallId?: string) => {
  return useQuery({
    queryKey: ["status-log", serviceCallId],
    queryFn: async () => {
      if (!serviceCallId) return [];

      const { data, error } = await supabase
        .from("service_call_status_log")
        .select(
          "id, service_call_id, field_changed, old_status_name, new_status_name, changed_by, changed_at",
        )
        .eq("service_call_id", serviceCallId)
        .order("changed_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = [
        ...new Set(data.filter((d) => d.changed_by).map((d) => d.changed_by!)),
      ];

      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p.full_name || "Usuário";
          });
        }
      }

      return data.map((entry) => ({
        ...entry,
        changed_by_name: entry.changed_by
          ? profilesMap[entry.changed_by] || "Usuário"
          : "Sistema",
      })) as StatusLogEntry[];
    },
    enabled: !!serviceCallId,
  });
};
