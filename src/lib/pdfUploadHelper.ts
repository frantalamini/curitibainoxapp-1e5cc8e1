import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

/**
 * Faz upload do PDF para o Supabase Storage e retorna a URL pública
 */
export const uploadPdfToStorage = async (
  pdf: jsPDF,
  serviceCallId: string
): Promise<string> => {
  // Converter PDF para Blob
  const pdfBlob = pdf.output("blob");
  
  // Nome do arquivo com timestamp para evitar conflitos
  const timestamp = Date.now();
  const fileName = `relatorios/chamado-${serviceCallId}-${timestamp}.pdf`;
  
  // Upload para o bucket
  const { data, error } = await supabase.storage
    .from("service-call-attachments")
    .upload(fileName, pdfBlob, {
      contentType: "application/pdf",
      upsert: false,
    });
  
  if (error) {
    console.error("Erro ao fazer upload do PDF:", error);
    throw new Error("Não foi possível fazer upload do PDF");
  }
  
  // Obter URL pública
  const { data: publicUrlData } = supabase.storage
    .from("service-call-attachments")
    .getPublicUrl(fileName);
  
  return publicUrlData.publicUrl;
};
