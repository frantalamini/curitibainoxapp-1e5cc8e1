import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Campos técnicos que a IA preenche a partir de áudio + fotos da OS.
// NUNCA inclui preço, item ou valor — técnico não tem acesso a finanças.
export interface AIFilledOSFields {
  problem_description: string | null;
  technical_diagnosis: string | null;
  defect_found: string | null;
  equipment_description: string | null;
  equipment_manufacturer: string | null;
  equipment_serial_number: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
}

// Lê um File/Blob como data URL (data:<mime>;base64,<dados>).
const toDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const stripPrefix = (dataUrl: string) =>
  dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

export const useFillOSFromMedia = () => {
  const [isLoading, setIsLoading] = useState(false);

  // audio: Blob webm (opcional) · images: File[] de fotos (opcional)
  const fillFromMedia = async (
    audio: Blob | null,
    images: File[],
  ): Promise<AIFilledOSFields | null> => {
    if (!audio && images.length === 0) {
      toast({
        title: "Nada para analisar",
        description: "Grave um áudio ou anexe ao menos uma foto.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const audioB64 = audio ? stripPrefix(await toDataUrl(audio)) : null;
      const imagesB64 = await Promise.all(images.map((f) => toDataUrl(f)));

      const { data, error } = await supabase.functions.invoke(
        "fill-os-from-media",
        { body: { audio: audioB64, images: imagesB64 } },
      );

      if (error) throw error;
      if (!data?.success || !data?.data) {
        throw new Error(
          data?.error || "A IA não conseguiu interpretar o material.",
        );
      }

      return data.data as AIFilledOSFields;
    } catch (e) {
      toast({
        title: "Erro ao preencher com IA",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { fillFromMedia, isLoading };
};
