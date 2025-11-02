import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";
import { loadSystemLogoForPdf, addLogoToPdf } from "./pdfLogoHelper";
import { logger } from "./logger";

// Configuração do layout A4 compacto
const PDF_CONFIG = {
  margin: 14,
  fontSize: {
    h1: 16,
    h2: 12,
    base: 11,
    small: 9,
    footer: 8,
  },
  lineHeight: 1.25,
  sectionSpacing: 6,
  colors: {
    black: [0, 0, 0] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [200, 200, 200] as [number, number, number],
    border: [153, 153, 153] as [number, number, number],
  },
  photo: {
    perRow: 3,
    minWidth: 51,
    maxHeight: 41,
    spacing: 4,
  },
  signature: {
    maxHeight: 24,
    spacing: 8,
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
  
  // Buscar dados do checklist se houver
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

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { margin } = PDF_CONFIG;
  const contentWidth = pageWidth - 2 * margin;
  
  let yPos = margin;

  // ============ HELPERS ============
  
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize = PDF_CONFIG.fontSize.base) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * fontSize * 0.35);
  };

  const addSectionTitle = (title: string, y: number) => {
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text(title.toUpperCase(), margin, y);
    pdf.setFont("helvetica", "normal");
    return y + 6;
  };
  
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin - 10) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };
  
  const shouldRenderSection = (data: any) => {
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'string') return data.trim() !== '';
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(v => v !== null && v !== undefined && v !== '');
    }
    return data !== null && data !== undefined;
  };

  // ============ CABEÇALHO (2 colunas) ============
  
  // Logo à esquerda (com aspect ratio preservado)
  addLogoToPdf(pdf, logoBase64, {
    x: margin,
    y: margin,
    maxWidth: 48,
    maxHeight: 16,
    align: 'left',
  });
  
  // Dados da empresa à direita
  const rightColumnX = pageWidth - margin - 70;
  let tempY = margin;
  
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  pdf.setFont("helvetica", "bold");
  tempY = addText(companyData.name, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "normal");
  
  if (companyData.cnpj) {
    tempY = addText(`CNPJ: ${companyData.cnpj}`, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  if (companyData.ie) {
    tempY = addText(`IE: ${companyData.ie}`, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  if (companyData.phone) {
    tempY = addText(companyData.phone, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  if (companyData.email) {
    tempY = addText(companyData.email, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  if (companyData.website) {
    tempY = addText(companyData.website, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  if (companyData.address) {
    tempY = addText(companyData.address, rightColumnX, tempY, 70, PDF_CONFIG.fontSize.small);
  }
  
  yPos = Math.max(margin + 16, tempY) + 6;
  
  // Título centralizado
  pdf.setFontSize(PDF_CONFIG.fontSize.h1);
  pdf.setFont("helvetica", "bold");
  pdf.text(`ORDEM DE SERVIÇO Nº ${call.os_number}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 6;
  
  // Status + Data (centralizado)
  const statusMap: Record<string, string> = {
    pending: "Aguardando",
    in_progress: "Em Andamento",
    on_hold: "Pendente",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };
  
  const statusText = `${statusMap[call.status] || call.status} • ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`;
  pdf.setFontSize(PDF_CONFIG.fontSize.small);
  pdf.setFont("helvetica", "normal");
  pdf.text(statusText, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;
  
  // Linha separadora
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(...PDF_CONFIG.colors.lightGray);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += PDF_CONFIG.sectionSpacing;

  // ============ BLOCO META (2 colunas 60/40) ============
  
  const col1Width = contentWidth * 0.6;
  const col2Width = contentWidth * 0.4;
  const col2X = margin + col1Width + 5;
  
  const metaStartY = yPos;
  
  // COLUNA 1: Cliente
  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENTE", margin, yPos);
  yPos += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  
  if (call.clients?.full_name) {
    yPos = addText(`${call.clients.full_name}`, margin, yPos, col1Width - 5);
  }
  if ((call.clients as any)?.cpf_cnpj) {
    yPos = addText(`CNPJ/CPF: ${(call.clients as any).cpf_cnpj}`, margin, yPos, col1Width - 5, PDF_CONFIG.fontSize.small);
  }
  if (call.clients?.phone) {
    yPos = addText(`Tel: ${call.clients.phone}`, margin, yPos, col1Width - 5, PDF_CONFIG.fontSize.small);
  }
  if ((call.clients as any)?.email) {
    yPos = addText(`E-mail: ${(call.clients as any).email}`, margin, yPos, col1Width - 5, PDF_CONFIG.fontSize.small);
  }
  if (call.clients?.address) {
    yPos = addText(`End: ${call.clients.address}`, margin, yPos, col1Width - 5, PDF_CONFIG.fontSize.small);
  }
  
  const col1EndY = yPos;
  
  // COLUNA 2: Dados da OS
  yPos = metaStartY;
  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("DADOS DA OS", col2X, yPos);
  yPos += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  
  yPos = addText(`Nº OS: ${call.os_number}`, col2X, yPos, col2Width - 5, PDF_CONFIG.fontSize.small);
  
  if (call.service_types) {
    yPos = addText(`Tipo: ${call.service_types.name}`, col2X, yPos, col2Width - 5, PDF_CONFIG.fontSize.small);
  }
  
  yPos = addText(
    `Data: ${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}`,
    col2X,
    yPos,
    col2Width - 5,
    PDF_CONFIG.fontSize.small
  );
  
  if (call.started_at) {
    yPos = addText(
      `Abertura: ${format(new Date(call.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
      col2X,
      yPos,
      col2Width - 5,
      PDF_CONFIG.fontSize.small
    );
  }
  
  yPos = Math.max(col1EndY, yPos) + PDF_CONFIG.sectionSpacing;

  // ============ TÉCNICO (linha única) ============
  
  checkNewPage(10);
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  const techText = `TÉCNICO: ${call.technicians?.full_name || "N/A"} • Tel: ${call.technicians?.phone || "N/A"}`;
  yPos = addText(techText, margin, yPos, contentWidth);
  yPos += PDF_CONFIG.sectionSpacing;

  // ============ AGENDAMENTO ============
  
  checkNewPage(15);
  yPos = addSectionTitle("AGENDAMENTO", yPos);
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  
  const scheduleText = `Data: ${format(new Date(call.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • Hora: ${call.scheduled_time}`;
  yPos = addText(scheduleText, margin, yPos, contentWidth);
  
  if (call.started_at) {
    const startTime = format(new Date(call.started_at), "HH:mm", { locale: ptBR });
    const timeText = `Início: ${startTime}`;
    yPos = addText(timeText, margin, yPos, contentWidth, PDF_CONFIG.fontSize.small);
  }
  
  yPos += PDF_CONFIG.sectionSpacing;

  // ============ EQUIPAMENTO + Nº SÉRIE (mesma linha) ============
  
  checkNewPage(10);
  let equipText = `EQUIPAMENTO: ${call.equipment_description}`;
  if (call.equipment_serial_number) {
    equipText += ` | Nº SÉRIE: ${call.equipment_serial_number}`;
  }
  yPos = addText(equipText, margin, yPos, contentWidth, PDF_CONFIG.fontSize.base);
  yPos += PDF_CONFIG.sectionSpacing;

  // ============ DESCRIÇÃO DO PROBLEMA (ocultar se vazio) ============
  
  if (shouldRenderSection(call.problem_description)) {
    checkNewPage(15);
    yPos = addSectionTitle("DESCRIÇÃO DO PROBLEMA", yPos);
    yPos = addText(call.problem_description!, margin, yPos, contentWidth);
    yPos += PDF_CONFIG.sectionSpacing;
  }

  // ============ AÇÕES EXECUTADAS (ocultar se vazio) ============
  
  if (shouldRenderSection(call.technical_diagnosis)) {
    checkNewPage(15);
    yPos = addSectionTitle("AÇÕES EXECUTADAS", yPos);
    yPos = addText(call.technical_diagnosis!, margin, yPos, contentWidth);
    
    if (call.technical_diagnosis_audio_url) {
      pdf.setFontSize(PDF_CONFIG.fontSize.small);
      pdf.setTextColor(...PDF_CONFIG.colors.gray);
      pdf.text("🎤 Áudio disponível no sistema", margin, yPos);
      pdf.setTextColor(...PDF_CONFIG.colors.black);
      yPos += 4;
    }
    
    yPos += PDF_CONFIG.sectionSpacing;
  }

  // ============ OBSERVAÇÕES PARA O CLIENTE (ocultar se vazio) ============
  
  if (shouldRenderSection(call.notes)) {
    checkNewPage(15);
    yPos = addSectionTitle("OBSERVAÇÕES", yPos);
    yPos = addText(call.notes!, margin, yPos, contentWidth);
    yPos += PDF_CONFIG.sectionSpacing;
  }

  // ⚠️ IMPORTANTE: NÃO INCLUIR call.internal_notes_text

  // ============ CHECKLIST (ocultar se vazio) ============
  
  if (call.checklist_responses && checklistItems.length > 0) {
    checkNewPage(30);
    yPos = addSectionTitle("CHECKLIST", yPos);
    
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const responses = call.checklist_responses as Record<string, boolean>;
    const itemTextMap = new Map(checklistItems.map(item => [item.id, item.text]));
    
    const rowHeight = 6;
    let rowY = yPos;
    
    Object.entries(responses).forEach(([itemId, checked]) => {
      checkNewPage(rowHeight + 5);
      if (yPos !== rowY) rowY = yPos;
      
      const questionText = itemTextMap.get(itemId) || `Item ${itemId}`;
      const symbol = checked ? "[X]" : "[ ]";
      
      pdf.setDrawColor(...PDF_CONFIG.colors.border);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, rowY - 4, contentWidth, rowHeight);
      
      pdf.text(symbol, margin + 2, rowY);
      const lines = pdf.splitTextToSize(questionText, contentWidth - 15);
      pdf.text(lines, margin + 10, rowY);
      
      rowY += Math.max(rowHeight, lines.length * 4);
    });
    
    yPos = rowY + PDF_CONFIG.sectionSpacing;
  }

  // ============ FOTOS ANTES (3 por linha, ocultar se vazio) ============
  
  if (shouldRenderSection(call.photos_before_urls)) {
    const validUrls = call.photos_before_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      checkNewPage(50);
      yPos = addSectionTitle("FOTOS ANTES DO SERVIÇO", yPos);
      
      const { perRow, minWidth, maxHeight, spacing } = PDF_CONFIG.photo;
      const photoWidth = Math.min(minWidth, (contentWidth - spacing * (perRow - 1)) / perRow);
      
      let xPos = margin;
      let photosInRow = 0;
      
      for (const photoUrl of validUrls) {
        checkNewPage(maxHeight + 15);
        
        const imageData = await loadImageAsBase64(photoUrl);
        
        if (imageData) {
          try {
            let format = 'JPEG';
            if (imageData.startsWith('data:image/png')) format = 'PNG';
            else if (imageData.startsWith('data:image/webp')) format = 'WEBP';
            
            pdf.addImage(imageData, format, xPos, yPos, photoWidth, maxHeight);
            
            pdf.setLineWidth(0.2);
            pdf.setDrawColor(...PDF_CONFIG.colors.border);
            pdf.rect(xPos, yPos, photoWidth, maxHeight);
          } catch (error) {
            console.error("Erro ao adicionar foto:", error);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(xPos, yPos, photoWidth, maxHeight, 'F');
          }
        }
        
        photosInRow++;
        
        if (photosInRow === perRow) {
          yPos += maxHeight + spacing;
          xPos = margin;
          photosInRow = 0;
        } else {
          xPos += photoWidth + spacing;
        }
      }
      
      if (photosInRow > 0) {
        yPos += maxHeight + spacing;
      }
      
      yPos += PDF_CONFIG.sectionSpacing;
    }
  }

  // ============ FOTOS DEPOIS (mesmo layout) ============
  
  if (shouldRenderSection(call.photos_after_urls)) {
    const validUrls = call.photos_after_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      checkNewPage(50);
      yPos = addSectionTitle("FOTOS DEPOIS DO SERVIÇO", yPos);
      
      const { perRow, minWidth, maxHeight, spacing } = PDF_CONFIG.photo;
      const photoWidth = Math.min(minWidth, (contentWidth - spacing * (perRow - 1)) / perRow);
      
      let xPos = margin;
      let photosInRow = 0;
      
      for (const photoUrl of validUrls) {
        checkNewPage(maxHeight + 15);
        
        const imageData = await loadImageAsBase64(photoUrl);
        
        if (imageData) {
          try {
            let format = 'JPEG';
            if (imageData.startsWith('data:image/png')) format = 'PNG';
            else if (imageData.startsWith('data:image/webp')) format = 'WEBP';
            
            pdf.addImage(imageData, format, xPos, yPos, photoWidth, maxHeight);
            
            pdf.setLineWidth(0.2);
            pdf.setDrawColor(...PDF_CONFIG.colors.border);
            pdf.rect(xPos, yPos, photoWidth, maxHeight);
          } catch (error) {
            console.error("Erro ao adicionar foto:", error);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(xPos, yPos, photoWidth, maxHeight, 'F');
          }
        }
        
        photosInRow++;
        
        if (photosInRow === perRow) {
          yPos += maxHeight + spacing;
          xPos = margin;
          photosInRow = 0;
        } else {
          xPos += photoWidth + spacing;
        }
      }
      
      if (photosInRow > 0) {
        yPos += maxHeight + spacing;
      }
      
      yPos += PDF_CONFIG.sectionSpacing;
    }
  }

  // ============ INDICADORES DE VÍDEO (se houver) ============
  
  if (call.video_before_url) {
    checkNewPage(12);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, contentWidth, 10, 'F');
    pdf.setFontSize(PDF_CONFIG.fontSize.small);
    pdf.text("▶ Vídeo ANTES disponível no sistema", margin + 2, yPos + 6);
    yPos += 12;
  }
  
  if (call.video_after_url) {
    checkNewPage(12);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, contentWidth, 10, 'F');
    pdf.setFontSize(PDF_CONFIG.fontSize.small);
    pdf.text("▶ Vídeo DEPOIS disponível no sistema", margin + 2, yPos + 6);
    yPos += 12;
  }

  // ============ ASSINATURAS (2 colunas lado a lado) ============
  
  const hasSignatures = (call.technician_signature_url || call.technician_signature_data) || 
                        (call.customer_signature_url || call.customer_signature_data);
  
  if (hasSignatures) {
    checkNewPage(60);
    
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(...PDF_CONFIG.colors.lightGray);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;
    
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("ASSINATURAS", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
    pdf.setFont("helvetica", "normal");
    
    const sigColWidth = (contentWidth - PDF_CONFIG.signature.spacing) / 2;
    const sigCol2X = margin + sigColWidth + PDF_CONFIG.signature.spacing;
    
    const sigStartY = yPos;
    let techY = sigStartY;
    let clientY = sigStartY;
    
    // COLUNA 1: Técnico
    if (call.technician_signature_url || call.technician_signature_data) {
      pdf.setFontSize(PDF_CONFIG.fontSize.base);
      pdf.setFont("helvetica", "bold");
      pdf.text("TÉCNICO", margin, techY);
      techY += 5;
      pdf.setFont("helvetica", "normal");
      
      const signatureData = call.technician_signature_url 
        ? await loadImageAsBase64(call.technician_signature_url)
        : call.technician_signature_data;
      
      if (signatureData && signatureData.startsWith('data:image/')) {
        try {
          pdf.addImage(signatureData, "PNG", margin, techY, sigColWidth, PDF_CONFIG.signature.maxHeight);
          techY += PDF_CONFIG.signature.maxHeight + 3;
        } catch (error) {
          console.error("Erro ao adicionar assinatura técnico:", error);
          pdf.setFontSize(PDF_CONFIG.fontSize.small);
          pdf.text("Não assinado", margin, techY);
          techY += 5;
        }
      } else {
        pdf.setFontSize(PDF_CONFIG.fontSize.small);
        pdf.text("Não assinado", margin, techY);
        techY += 5;
      }
      
      pdf.setFontSize(PDF_CONFIG.fontSize.small);
      techY = addText(call.technicians?.full_name || "N/A", margin, techY, sigColWidth, PDF_CONFIG.fontSize.small);
      
      if (call.technician_signature_date) {
        pdf.setTextColor(...PDF_CONFIG.colors.gray);
        techY = addText(
          format(new Date(call.technician_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          margin,
          techY,
          sigColWidth,
          PDF_CONFIG.fontSize.small
        );
        pdf.setTextColor(...PDF_CONFIG.colors.black);
      }
    }
    
    // COLUNA 2: Cliente
    if (call.customer_signature_url || call.customer_signature_data) {
      pdf.setFontSize(PDF_CONFIG.fontSize.base);
      pdf.setFont("helvetica", "bold");
      pdf.text("CLIENTE", sigCol2X, clientY);
      clientY += 5;
      pdf.setFont("helvetica", "normal");
      
      const signatureData = call.customer_signature_url 
        ? await loadImageAsBase64(call.customer_signature_url)
        : call.customer_signature_data;
      
      if (signatureData && signatureData.startsWith('data:image/')) {
        try {
          pdf.addImage(signatureData, "PNG", sigCol2X, clientY, sigColWidth, PDF_CONFIG.signature.maxHeight);
          clientY += PDF_CONFIG.signature.maxHeight + 3;
        } catch (error) {
          console.error("Erro ao adicionar assinatura cliente:", error);
          pdf.setFontSize(PDF_CONFIG.fontSize.small);
          pdf.text("Não assinado", sigCol2X, clientY);
          clientY += 5;
        }
      } else {
        pdf.setFontSize(PDF_CONFIG.fontSize.small);
        pdf.text("Não assinado", sigCol2X, clientY);
        clientY += 5;
      }
      
      pdf.setFontSize(PDF_CONFIG.fontSize.small);
      clientY = addText(
        call.customer_name || call.clients?.full_name || "N/A",
        sigCol2X,
        clientY,
        sigColWidth,
        PDF_CONFIG.fontSize.small
      );
      
      if (call.customer_position) {
        clientY = addText(
          `Cargo: ${call.customer_position}`,
          sigCol2X,
          clientY,
          sigColWidth,
          PDF_CONFIG.fontSize.small
        );
      }
      
      if (call.customer_signature_date) {
        pdf.setTextColor(...PDF_CONFIG.colors.gray);
        clientY = addText(
          format(new Date(call.customer_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          sigCol2X,
          clientY,
          sigColWidth,
          PDF_CONFIG.fontSize.small
        );
        pdf.setTextColor(...PDF_CONFIG.colors.black);
      }
    }
    
    yPos = Math.max(techY, clientY) + 5;
  }

  // ============ RODAPÉ (todas as páginas) ============
  
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(PDF_CONFIG.fontSize.footer);
    pdf.setTextColor(...PDF_CONFIG.colors.gray);
    pdf.text(
      `Página ${i} de ${pageCount} — ${companyData.name}`,
      pageWidth / 2,
      pageHeight - margin + 5,
      { align: "center" }
    );
    pdf.setTextColor(...PDF_CONFIG.colors.black);
  }

  return pdf;
};
