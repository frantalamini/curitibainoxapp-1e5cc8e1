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
    border: [0, 0, 0] as [number, number, number],
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
  box: {
    borderWidth: 0.5,
    borderColor: [0, 0, 0] as [number, number, number],
    padding: 4,
    titleSpacing: 2,
  },
  table: {
    cellPadding: 3,
    borderWidth: 0.5,
    labelWidth: 45,
  },
  logo: {
    maxWidth: 60,
    maxHeight: 22,
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
  
  // Logo à esquerda (maior e com aspect ratio preservado)
  addLogoToPdf(pdf, logoBase64, {
    x: margin,
    y: margin,
    maxWidth: PDF_CONFIG.logo.maxWidth,
    maxHeight: PDF_CONFIG.logo.maxHeight,
    align: 'left',
  });
  
  // Dados da empresa alinhados à direita
  const rightColumnWidth = 70;
  let tempY = margin;

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text(companyData.name, pageWidth - margin, tempY, { align: "right" });
  tempY += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.small);

  if (companyData.cnpj) {
    pdf.text(`CNPJ: ${companyData.cnpj}`, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.ie) {
    pdf.text(`IE: ${companyData.ie}`, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.phone) {
    pdf.text(companyData.phone, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.email) {
    pdf.text(companyData.email, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.website) {
    pdf.text(companyData.website, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.address) {
    const addressLines = pdf.splitTextToSize(companyData.address, rightColumnWidth);
    addressLines.forEach((line: string) => {
      pdf.text(line, pageWidth - margin, tempY, { align: "right" });
      tempY += 4;
    });
  }

  yPos = Math.max(margin + PDF_CONFIG.logo.maxHeight, tempY) + 6;

  // Linha horizontal após cabeçalho
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // Título "ORDEM DE SERVIÇO" com destaque
  pdf.setFontSize(PDF_CONFIG.fontSize.h1);
  pdf.setFont("helvetica", "bold");
  pdf.text(`ORDEM DE SERVIÇO Nº ${call.os_number}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 4;
  
  // Linha horizontal após título
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // Status + Data
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
  yPos += 10;

  // ============ SEÇÃO CLIENTE E DADOS DA OS (Modelo de Referência) ============
  
  const col1Width = contentWidth * 0.6;
  const col2Width = contentWidth * 0.4;
  const col2X = margin + col1Width + 5;

  // Título "Cliente" centralizado
  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Cliente", margin + col1Width / 2, yPos, { align: "center" });
  yPos += 6;

  // Caixa do cliente (sem labels internos)
  const clientBoxY = yPos;
  const clientLines: string[] = [];

  if (call.clients?.full_name) {
    clientLines.push(call.clients.full_name);
  }
  if ((call.clients as any)?.cpf_cnpj) {
    clientLines.push((call.clients as any).cpf_cnpj);
  }
  if (call.clients?.address) {
    const addressParts = pdf.splitTextToSize(call.clients.address, col1Width - 2 * PDF_CONFIG.box.padding);
    clientLines.push(...addressParts);
  }
  if (call.clients?.phone) {
    clientLines.push(`Fone: ${call.clients.phone}`);
  }
  if ((call.clients as any)?.email) {
    clientLines.push((call.clients as any).email);
  }

  const clientBoxHeight = Math.max(clientLines.length * 5 + 2 * PDF_CONFIG.box.padding, 50);

  // Desenhar borda da caixa
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, clientBoxY, col1Width, clientBoxHeight);

  // Conteúdo
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  let lineY = clientBoxY + PDF_CONFIG.box.padding + 4;
  clientLines.forEach(line => {
    pdf.text(line, margin + PDF_CONFIG.box.padding, lineY);
    lineY += 5;
  });

  // Tabela de dados da OS à direita
  const osDataY = clientBoxY;
  const rowHeight = 10;
  const tableData = [
    { label: "Número da OS", value: call.os_number },
    { label: "Data", value: format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR }) },
    { label: "Data prevista", value: call.started_at ? format(new Date(call.started_at), "dd/MM/yyyy", { locale: ptBR }) : "" },
  ];

  let currentY = osDataY;

  tableData.forEach(row => {
    // Borda das células
    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(col2X, currentY, PDF_CONFIG.table.labelWidth, rowHeight);
    pdf.rect(col2X + PDF_CONFIG.table.labelWidth, currentY, col2Width - PDF_CONFIG.table.labelWidth, rowHeight);

    // Label (negrito)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    pdf.text(row.label, col2X + PDF_CONFIG.table.cellPadding, currentY + 6.5);

    // Valor (normal)
    pdf.setFont("helvetica", "normal");
    pdf.text(String(row.value), col2X + PDF_CONFIG.table.labelWidth + PDF_CONFIG.table.cellPadding, currentY + 6.5);

    currentY += rowHeight;
  });

  yPos = Math.max(clientBoxY + clientBoxHeight, currentY) + PDF_CONFIG.sectionSpacing;

  // ============ TÉCNICO (caixa com borda) ============
  
  checkNewPage(20);

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Técnico responsável", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  const techBoxY = yPos;
  const techText = `${call.technicians?.full_name || "N/A"} • Tel: ${call.technicians?.phone || "N/A"}`;
  const techBoxHeight = 12;

  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, techBoxY, contentWidth, techBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  pdf.text(techText, margin + PDF_CONFIG.box.padding, techBoxY + 8);

  yPos = techBoxY + techBoxHeight + PDF_CONFIG.sectionSpacing;

  // ============ AGENDAMENTO (caixa com borda) ============
  
  checkNewPage(25);

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Agendamento", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  const schedBoxY = yPos;
  const schedLines: string[] = [];

  schedLines.push(`Data: ${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })} • Hora: ${call.scheduled_time}`);
  
  if (call.started_at) {
    const startTime = format(new Date(call.started_at), "HH:mm", { locale: ptBR });
    schedLines.push(`Início: ${startTime}`);
  }

  const schedBoxHeight = schedLines.length * 5 + 2 * PDF_CONFIG.box.padding;

  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, schedBoxY, contentWidth, schedBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  let schedLineY = schedBoxY + PDF_CONFIG.box.padding + 4;
  schedLines.forEach(line => {
    pdf.text(line, margin + PDF_CONFIG.box.padding, schedLineY);
    schedLineY += 5;
  });

  yPos = schedBoxY + schedBoxHeight + PDF_CONFIG.sectionSpacing;

  // ============ EQUIPAMENTO (caixa com título centralizado) ============
  
  checkNewPage(20);

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Equipamento", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  const equipBoxY = yPos;
  let equipText = call.equipment_description || "N/A";
  if (call.equipment_serial_number) {
    equipText += ` | Nº de série: ${call.equipment_serial_number}`;
  }

  const equipLines = pdf.splitTextToSize(equipText, contentWidth - 2 * PDF_CONFIG.box.padding);
  const equipBoxHeight = equipLines.length * 5 + 2 * PDF_CONFIG.box.padding;

  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, equipBoxY, contentWidth, equipBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  let equipLineY = equipBoxY + PDF_CONFIG.box.padding + 4;
  equipLines.forEach((line: string) => {
    pdf.text(line, margin + PDF_CONFIG.box.padding, equipLineY);
    equipLineY += 5;
  });

  yPos = equipBoxY + equipBoxHeight + PDF_CONFIG.sectionSpacing;

  // ============ PROBLEMA (caixa com título centralizado) ============
  
  if (shouldRenderSection(call.problem_description)) {
    checkNewPage(20);

    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Problema", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    const problemBoxY = yPos;
    const problemLines = pdf.splitTextToSize(call.problem_description, contentWidth - 2 * PDF_CONFIG.box.padding);
    const problemBoxHeight = problemLines.length * 5 + 2 * PDF_CONFIG.box.padding;

    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(margin, problemBoxY, contentWidth, problemBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    let problemLineY = problemBoxY + PDF_CONFIG.box.padding + 4;
    problemLines.forEach((line: string) => {
      pdf.text(line, margin + PDF_CONFIG.box.padding, problemLineY);
      problemLineY += 5;
    });

    yPos = problemBoxY + problemBoxHeight + PDF_CONFIG.sectionSpacing;
  }

  // ============ AÇÕES EXECUTADAS (caixa com título centralizado) ============
  
  if (shouldRenderSection(call.technical_diagnosis)) {
    checkNewPage(20);

    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Ações executadas", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    const actionsBoxY = yPos;
    const actionsLines = pdf.splitTextToSize(call.technical_diagnosis, contentWidth - 2 * PDF_CONFIG.box.padding);
    let actionsBoxHeight = actionsLines.length * 5 + 2 * PDF_CONFIG.box.padding;

    // Adicionar espaço para indicador de áudio se houver
    if (call.technical_diagnosis_audio_url) {
      actionsBoxHeight += 6;
    }

    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(margin, actionsBoxY, contentWidth, actionsBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    let actionsLineY = actionsBoxY + PDF_CONFIG.box.padding + 4;
    actionsLines.forEach((line: string) => {
      pdf.text(line, margin + PDF_CONFIG.box.padding, actionsLineY);
      actionsLineY += 5;
    });

    // Audio indicator if available
    if (call.technical_diagnosis_audio_url) {
      pdf.setFontSize(PDF_CONFIG.fontSize.small);
      pdf.setTextColor(...PDF_CONFIG.colors.gray);
      pdf.text("🎤 Áudio disponível no sistema", margin + PDF_CONFIG.box.padding, actionsLineY);
      pdf.setTextColor(...PDF_CONFIG.colors.black);
    }

    yPos = actionsBoxY + actionsBoxHeight + PDF_CONFIG.sectionSpacing;
  }

  // ============ OBSERVAÇÕES (caixa com título centralizado) ============
  
  if (shouldRenderSection(call.notes)) {
    checkNewPage(20);

    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Observações", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    const notesBoxY = yPos;
    const notesLines = pdf.splitTextToSize(call.notes, contentWidth - 2 * PDF_CONFIG.box.padding);
    const notesBoxHeight = notesLines.length * 5 + 2 * PDF_CONFIG.box.padding;

    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(margin, notesBoxY, contentWidth, notesBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    let notesLineY = notesBoxY + PDF_CONFIG.box.padding + 4;
    notesLines.forEach((line: string) => {
      pdf.text(line, margin + PDF_CONFIG.box.padding, notesLineY);
      notesLineY += 5;
    });

    yPos = notesBoxY + notesBoxHeight + PDF_CONFIG.sectionSpacing;
  }

  // ⚠️ IMPORTANTE: NÃO INCLUIR call.internal_notes_text

  // ============ CHECKLIST (caixa com título centralizado) ============
  
  if (call.checklist_responses && checklistItems.length > 0) {
    checkNewPage(30);

    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Checklist", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
    
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
      
      // Draw cell border
      pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
      pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
      pdf.rect(margin, rowY - 4, contentWidth, rowHeight);
      
      pdf.text(symbol, margin + 2, rowY);
      const lines = pdf.splitTextToSize(questionText, contentWidth - 15);
      pdf.text(lines, margin + 10, rowY);
      
      rowY += Math.max(rowHeight, lines.length * 4);
    });
    
    yPos = rowY + PDF_CONFIG.sectionSpacing;
  }

  // ============ FOTOS ANTES (com título centralizado) ============
  
  if (shouldRenderSection(call.photos_before_urls)) {
    const validUrls = call.photos_before_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      checkNewPage(50);

      pdf.setFontSize(PDF_CONFIG.fontSize.h2);
      pdf.setFont("helvetica", "bold");
      pdf.text("Fotos antes do serviço", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      
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
            
            // Draw border around photo
            pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
            pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
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

  // ============ FOTOS DEPOIS (com título centralizado) ============
  
  if (shouldRenderSection(call.photos_after_urls)) {
    const validUrls = call.photos_after_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      checkNewPage(50);

      pdf.setFontSize(PDF_CONFIG.fontSize.h2);
      pdf.setFont("helvetica", "bold");
      pdf.text("Fotos depois do serviço", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      
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
            
            // Draw border around photo
            pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
            pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
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
    
    // Add separator line
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Add section title
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Assinaturas", pageWidth / 2, yPos, { align: "center" });
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
