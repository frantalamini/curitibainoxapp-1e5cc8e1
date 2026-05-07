import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QRWhatsAppSettings {
  number: string;
  default_message: string;
}

export interface QRHubLink {
  id: string;
  icon: string;
  name: string;
  description: string;
  url: string;
  active: boolean;
}

export interface QRPrintingSettings {
  default_printer: "thermal" | "a4";
  include_phone: boolean;
  include_website: boolean;
}

const TABLE = "qr_module_settings";

export const useQRSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from(TABLE).select("*");
      if (error) throw error;

      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        map[row.setting_key] = row.setting_value;
      });

      return {
        whatsapp: (map.whatsapp || {
          number: "",
          default_message: "",
        }) as QRWhatsAppSettings,
        hub_links: (map.hub_links || []) as QRHubLink[],
        printing: (map.printing || {
          default_printer: "thermal",
          include_phone: true,
          include_website: true,
        }) as QRPrintingSettings,
      };
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({ title: "Sucesso", description: "Configuracao salva" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: settings || {
      whatsapp: { number: "", default_message: "" },
      hub_links: [],
      printing: {
        default_printer: "thermal" as const,
        include_phone: true,
        include_website: true,
      },
    },
    isLoading,
    updateSetting: updateSettingMutation.mutateAsync,
  };
};
