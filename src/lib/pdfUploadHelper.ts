import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { logger } from "./logger";
import { toPdfBlob } from "./pdfBlobHelpers";

/**
 * Faz upload do PDF para o Supabase Storage e retorna a URL pública e o caminho do arquivo
 * Aceita jsPDF instance ou Blob diretamente
 */
export const uploadPdfToStorage = async (
  pdfInput: jsPDF | Blob,
  serviceCallId: string,
  fileName?: string
): Promise<{ signedUrl: string; filePath: string }> => {
  try {
    // Converter para Blob se necessário
    const pdfBlob = await toPdfBlob(pdfInput);
    
    // Nome do arquivo com timestamp para evitar conflitos
    const timestamp = Date.now();
    const finalFileName = fileName 
      ? `relatorios/${fileName.replace('.pdf', '')}-${timestamp}.pdf`
      : `relatorios/chamado-${serviceCallId}-${timestamp}.pdf`;
    
    // Upload para o bucket
    const { data, error } = await supabase.storage
      .from("service-call-attachments")
      .upload(finalFileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: false,
      });
    
    if (error) {
      logger.error("Erro ao fazer upload do PDF:", error);
      throw new Error("Não foi possível fazer upload do PDF");
    }
    
    // Obter URL assinada (bucket privado) - válida por 7 dias
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("service-call-attachments")
      .createSignedUrl(finalFileName, 604800); // 7 dias em segundos
    
    if (signedUrlError || !signedUrlData) {
      logger.error("Erro ao gerar URL assinada:", signedUrlError);
      throw new Error("Não foi possível gerar URL de acesso ao PDF");
    }
    
    return {
      signedUrl: signedUrlData.signedUrl,
      filePath: data.path,
    };
  } catch (error) {
    logger.error("Erro ao processar upload do PDF:", error);
    throw error;
  }
};
