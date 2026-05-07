import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QRCode {
  id: string;
  code: string;
  qr_type: "fabricated" | "assistance";
  product_id?: string;
  lot_number?: string;
  serial_number?: string;
  equipment_id?: string;
  client_id?: string;
  template_id?: string;
  batch_id?: string;
  category?: string;
  destination_url?: string;
  scanned_count: number;
  last_scanned_at?: string;
  status: "active" | "linked" | "disabled";
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const TABLE = "qr_codes";

// Gera o codigo serial baseado no formato do produto
function generateSerialCode(
  format: string,
  prefix: string,
  nextSerial: number,
): string {
  const year = new Date().getFullYear();
  const seq = String(nextSerial).padStart(5, "0");
  switch (format) {
    case "prefix_year_seq":
      return `${prefix}-${year}-${seq}`;
    case "sequential":
      return seq;
    case "model_seq":
      return `${prefix}-${seq}`;
    default:
      return `${prefix}-${year}-${seq}`;
  }
}

// Gera o numero do lote baseado no formato
function generateLotNumber(format: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  switch (format) {
    case "lt_year_month":
      return `LT-${year}-${month}`;
    case "lt_seq":
      return `LT-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    default:
      return `LT-${year}-${month}`;
  }
}

export const useQRCodes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: qrCodes = [], isLoading } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as QRCode[];
    },
  });

  // Gerar QR Codes para Produtos Fabricados
  const generateFabricatedMutation = useMutation({
    mutationFn: async ({
      productId,
      templateId,
      quantity,
      serialFormat,
      serialPrefix,
      nextSerial,
      lotFormat,
      destinationUrl,
    }: {
      productId: string;
      templateId: string;
      quantity: number;
      serialFormat: string;
      serialPrefix: string;
      nextSerial: number;
      lotFormat: string;
      destinationUrl?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const batchId = crypto.randomUUID();
      const lotNumber = generateLotNumber(lotFormat);
      const codes: any[] = [];

      for (let i = 0; i < quantity; i++) {
        const serial = generateSerialCode(
          serialFormat,
          serialPrefix,
          nextSerial + i,
        );
        codes.push({
          code: serial,
          qr_type: "fabricated",
          product_id: productId,
          lot_number: lotNumber,
          serial_number: serial,
          template_id: templateId,
          batch_id: batchId,
          destination_url: destinationUrl || null,
          created_by: user.id,
        });
      }

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert(codes)
        .select();
      if (error) throw error;

      // Atualizar next_serial no produto
      await (supabase as any)
        .from("qr_products")
        .update({
          next_serial: nextSerial + quantity,
          lots_generated: (supabase as any).rpc ? undefined : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      // Incrementar times_used no template
      await (supabase as any)
        .rpc("increment_counter", {
          table_name: "qr_templates",
          column_name: "times_used",
          row_id: templateId,
        })
        .catch(() => {
          // Se a RPC nao existir, faz update manual
          (supabase as any)
            .from("qr_templates")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", templateId);
        });

      return { codes: data as QRCode[], batchId, lotNumber };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      queryClient.invalidateQueries({ queryKey: ["qr_products"] });
      queryClient.invalidateQueries({ queryKey: ["qr_templates"] });
      toast({
        title: "Sucesso",
        description: `${result.codes.length} QR Codes gerados com sucesso`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gerar QR Codes para Assistencia Tecnica
  const generateAssistanceMutation = useMutation({
    mutationFn: async ({
      templateId,
      quantity,
      category,
    }: {
      templateId: string;
      quantity: number;
      category?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");

      const batchId = crypto.randomUUID();
      const codes: any[] = [];

      for (let i = 0; i < quantity; i++) {
        const uniqueCode = `AT-${Date.now()}-${String(i + 1).padStart(4, "0")}`;
        codes.push({
          code: uniqueCode,
          qr_type: "assistance",
          template_id: templateId,
          batch_id: batchId,
          category: category || null,
          created_by: user.id,
        });
      }

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert(codes)
        .select();
      if (error) throw error;

      return { codes: data as QRCode[], batchId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({
        title: "Sucesso",
        description: `${result.codes.length} QR Codes gerados com sucesso`,
      });
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
    qrCodes,
    isLoading,
    generateFabricated: generateFabricatedMutation.mutateAsync,
    generateAssistance: generateAssistanceMutation.mutateAsync,
    isGenerating:
      generateFabricatedMutation.isPending ||
      generateAssistanceMutation.isPending,
  };
};

// Hook para estatisticas do modulo
export const useQRStats = () => {
  return useQuery({
    queryKey: [TABLE, "stats"],
    queryFn: async () => {
      const [codesResult, templatesResult] = await Promise.all([
        (supabase as any)
          .from(TABLE)
          .select("id, created_at", { count: "exact" }),
        (supabase as any).from("qr_templates").select("id", { count: "exact" }),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const todayResult = await (supabase as any)
        .from(TABLE)
        .select("id", { count: "exact" })
        .gte("created_at", today);

      return {
        totalGenerated: codesResult.count || 0,
        todayGenerated: todayResult.count || 0,
        totalTemplates: templatesResult.count || 0,
      };
    },
    staleTime: 30 * 1000,
  });
};
