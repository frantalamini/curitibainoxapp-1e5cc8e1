import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";
import { loadSystemLogoForPdf, addLogoToPdf } from "./pdfLogoHelper";
import { logger } from "./logger";

// Configuração do layout A4 - Template minimalista
const PDF_CONFIG = {
  margin: 25, // ✅ 25mm conforme requisito
  fontSize: {
    h1: 13,      // ✅ Título menor
    h2: 12,      // ✅ Seções em caixa-alta
    base: 11,    // ✅ Texto padrão
    small: 9,
    footer: 8,
  },
  lineHeight: 1.25,
  sectionSpacing: 8,
  colors: {
    black: [17, 17, 17] as [number, number, number],           // ✅ #111
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [240, 240, 240] as [number, number, number],
    border: [201, 206, 214] as [number, number, number],       // ✅ #C9CED6 (linha fina)
  },
  photo: {
    perRow: 3,
    spacing: 4,
  },
  signature: {
    maxWidth: 63,   // ~180px
    maxHeight: 21,  // ~60px
    spacing: 8,
    lineWidth: 70,  // ~70-80mm linha horizontal
  },
  box: {
    borderWidth: 0.35,               // ✅ 0.5pt (mais fino)
    borderColor: [201, 206, 214] as [number, number, number],    // ✅ #C9CED6
    padding: 4,
    titleSpacing: 2,
  },
  table: {
    cellPadding: 3,
    borderWidth: 0.35,
    labelWidth: 50,
  },
  logo: {
    maxWidth: 50,
    maxHeight: 40,  // ✅ 40px altura fixa
  },
};

// Helper function to load images as Base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    logger.log("🔄 Tentando carregar imagem:", url);
    
    const urlParts = url.split('/storage/v1/object/');
    if (urlParts.length >= 2) {
      const fullPath = urlParts[1];
      const pathParts = fullPath.split('/');
      const bucketName = pathParts[1];
      const filePath = pathParts.slice(2).join('/');
      
      logger.log("📦 Bucket:", bucketName, "| Arquivo:", filePath);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);
      
      if (!error && data) {
        logger.log("✅ Imagem baixada via Supabase, tamanho:", data.size, "bytes");
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            logger.log("✅ Conversão Base64 concluída");
            resolve(reader.result as string);
          };
          reader.onerror = (err) => {
            console.error("❌ Erro ao converter para Base64:", err);
            resolve(null);
          };
          reader.readAsDataURL(data);
        });
      } else if (error) {
        logger.warn("⚠️ Erro ao baixar via Supabase:", error);
      }
    }
    
    logger.log("🔄 Tentando fetch direto...");
    const response = await fetch(url);
    if (!response.ok) {
      console.error("❌ Fetch falhou:", response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    logger.log("✅ Imagem baixada via fetch, tamanho:", blob.size, "bytes");
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logger.log("✅ Conversão Base64 concluída");
        resolve(reader.result as string);
      };
      reader.onerror = (err) => {
        console.error("❌ Erro ao converter para Base64:", err);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("❌ Erro geral ao carregar imagem:", error);
    return null;
  }
};

// Buscar dados completos da empresa
const getCompanyData = async () => {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("company_name, logo_url")
      .single();
    
    // TODO: Adicionar campos CNPJ, endereço, etc. via migração
    // Por enquanto, usar dados fixos
    return {
      name: data?.company_name || "Curitiba Inox",
      cnpj: "12.345.678/0001-90",
      phone: "(41) 3333-4444",
      email: "contato@curitibainox.com.br",
      website: "www.curitibainox.com.br",
      address: "Rua Exemplo, 123 - Curitiba/PR",
      ie: "123.456.789",
    };
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    return {
      name: "Curitiba Inox",
      cnpj: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      ie: "",
    };
  }
};

export const generateServiceCallReport = async (call: ServiceCall): Promise<jsPDF> => {
  const logoBase64 = await loadSystemLogoForPdf();
  const companyData = await getCompanyData();
  
  // Buscar checklist items se o chamado tiver checklist preenchido
  let checklistItems: Array<{ id: string; text: string }> = [];
  if (call.checklist_id && call.checklist_responses) {
    try {
      const { data: checklistData } = await supabase
        .from("checklists")
        .select("items")
        .eq("id", call.checklist_id)
        .single();
      
      if (checklistData?.items) {
        checklistItems = checklistData.items as Array<{ id: string; text: string }>;
      }
    } catch (error) {
      console.error("Error loading checklist items:", error);
    }
  }
  
  // Gerar HTML do template
  const { generateServiceCallHtmlTemplate } = await import('./reportPdfTemplate');
  const htmlContent = generateServiceCallHtmlTemplate(
    call,
    companyData,
    checklistItems,
    logoBase64
  );
  
  // Criar PDF a partir do HTML
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // Criar elemento temporário para renderizar HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  document.body.appendChild(tempDiv);
  
  try {
    // Converter HTML para PDF usando jsPDF.html()
    await pdf.html(tempDiv, {
      callback: () => {
        document.body.removeChild(tempDiv);
      },
      margin: [25, 25, 25, 25], // 25mm em todos os lados
      x: 0,
      y: 0,
      width: 160, // Largura útil após margens (210mm - 50mm)
      windowWidth: 794, // A4 width em pixels (210mm * 96dpi / 25.4)
      html2canvas: {
        scale: 2, // Alta qualidade
        useCORS: true, // Permitir imagens externas
        logging: false,
      }
    });
  } catch (error) {
    document.body.removeChild(tempDiv);
    throw error;
  }
  
  return pdf;
};

/**
 * Gera PDF e retorna Blob + metadados
 * Versão otimizada que evita conversões desnecessárias
 */
export async function generateServiceCallReportBlob(
  call: ServiceCall
): Promise<{ blob: Blob; fileName: string; osNumber: string }> {
  const { toPdfBlob, generatePdfFileName } = await import("./pdfBlobHelpers");
  
  const pdf = await generateServiceCallReport(call);
  const blob = await toPdfBlob(pdf);
  const fileName = generatePdfFileName(call.os_number);
  
  return {
    blob,
    fileName,
    osNumber: String(call.os_number),
  };
}
