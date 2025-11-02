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
    h3: 10,
    base: 11,
    small: 9,
    footer: 8,
  },
  lineHeight: 1.25,
  sectionSpacing: 3,
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
    boxHeight: 42,
    boxWidth: 0.48,
    gap: 0.04,
  },
  box: {
    borderWidth: 0.5,
    borderColor: [0, 0, 0] as [number, number, number],
    padding: 6,
    titleSpacing: 3,
  },
  table: {
    cellPadding: 3,
    borderWidth: 0.5,
    labelWidth: 45,
  },
  logo: {
    maxWidth: 49,
    maxHeight: 13,
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
      .select("company_name, report_logo, logo_url, company_cnpj, company_ie, company_phone, company_email, company_website, company_address")
      .single();
    
    return {
      name: data?.company_name || "Curitiba Inox",
      cnpj: data?.company_cnpj || "12.345.678/0001-90",
      ie: data?.company_ie || "",
      phone: data?.company_phone || "(41) 3333-4444",
      email: data?.company_email || "contato@curitibainox.com.br",
      website: data?.company_website || "",
      address: data?.company_address || "Rua Exemplo, 123 - Curitiba/PR",
      logoUrl: data?.report_logo || data?.logo_url,
    };
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    return {
      name: "Curitiba Inox",
      cnpj: "",
      ie: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      logoUrl: null,
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
  
  const titleY = yPos;
  
  // Título "ORDEM DE SERVIÇO" centralizado
  pdf.setFontSize(PDF_CONFIG.fontSize.h1);
  pdf.setFont("helvetica", "bold");
  pdf.text(`ORDEM DE SERVIÇO Nº ${call.os_number}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 6;
  
  // Linha horizontal após título
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // ============ CAIXA DE METADADOS À DIREITA (alinhada ao título) ============
  
  const metaBoxWidth = 72;
  const metaBoxX = pageWidth - margin - metaBoxWidth;
  const metaBoxY = titleY;
  
  const metaData = [
    { label: "Número da OS", value: String(call.os_number || "") },
    {
      label: "Data",
      value: call.scheduled_date
        ? format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })
        : "",
    },
    {
      label: "Data prevista",
      value: call.started_at
        ? format(new Date(call.started_at), "dd/MM/yyyy", { locale: ptBR })
        : "",
    },
  ];
  
  // Adicionar "Finalizado em" se status for 'completed'
  if (call.status === 'completed' && call.updated_at) {
    metaData.push({
      label: "Finalizado em",
      value: format(new Date(call.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    });
  }

  const rowHeight = 10;
  const labelWidth = 35;
  const valueWidth = metaBoxWidth - labelWidth;

  let tableY = metaBoxY;
  metaData.forEach((row) => {
    // Bordas das células
    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(metaBoxX, tableY, labelWidth, rowHeight);
    pdf.rect(metaBoxX + labelWidth, tableY, valueWidth, rowHeight);

    // Label (negrito)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    pdf.text(row.label, metaBoxX + PDF_CONFIG.table.cellPadding, tableY + 6);

    // Valor (normal)
    pdf.setFont("helvetica", "normal");
    pdf.text(
      row.value,
      metaBoxX + labelWidth + PDF_CONFIG.table.cellPadding,
      tableY + 6
    );

    tableY += rowHeight;
  });

  // ============ SEÇÃO CLIENTE (texto precisa caber, sem invadir) ============
  
  yPos = tableY + 6;
  
  // Título "Cliente" centralizado
  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Cliente", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  // Preparar dados do cliente com word-wrap
  const clientBoxY = yPos;
  const clientBoxPadding = PDF_CONFIG.box.padding;
  const clientContentWidth = contentWidth - 2 * clientBoxPadding;
  
  const clientName = call.clients?.full_name || "";
  const clientCNPJ = (call.clients as any)?.cpf_cnpj || "";
  const clientIE = (call.clients as any)?.state_registration || "";
  
  // Endereço completo com word-wrap
  const addressParts = [];
  if (call.clients?.address || (call.clients as any)?.street) {
    const street = (call.clients as any)?.street || "";
    const number = (call.clients as any)?.number || "";
    const complement = (call.clients as any)?.complement || "";
    const neighborhood = (call.clients as any)?.neighborhood || "";
    const city = (call.clients as any)?.city || "";
    const state = (call.clients as any)?.state || "";
    const cep = (call.clients as any)?.cep || "";
    
    let addressLine = call.clients?.address || `${street}${number ? ', Nº ' + number : ''}${complement ? ', ' + complement : ''}`;
    if (neighborhood) addressLine += `, ${neighborhood}`;
    if (city || state) addressLine += ` – ${city}${state ? '/' + state : ''}`;
    if (cep) addressLine += ` – ${cep}`;
    
    addressParts.push(addressLine);
  }
  
  const clientPhone = call.clients?.phone || "";
  const clientPhone2 = (call.clients as any)?.phone_2 || "";
  const clientEmail = (call.clients as any)?.email || "";
  
  // Construir array de linhas
  const clientDataLines = [];
  if (clientName) clientDataLines.push({ text: clientName, bold: true });
  
  const cnpjIELine = [clientCNPJ, clientIE].filter(Boolean).join(' • ');
  if (cnpjIELine) clientDataLines.push({ text: cnpjIELine, bold: false });
  
  // Endereço com word-wrap
  if (addressParts.length > 0) {
    const wrappedAddress = pdf.splitTextToSize(addressParts[0], clientContentWidth);
    wrappedAddress.forEach((line: string) => {
      clientDataLines.push({ text: line, bold: false });
    });
  }
  
  const phones = [clientPhone, clientPhone2].filter(Boolean).join(', ');
  if (phones) clientDataLines.push({ text: `Telefone: ${phones}`, bold: false });
  if (clientEmail) clientDataLines.push({ text: `E-mail: ${clientEmail}`, bold: false });
  
  // Calcular altura dinâmica da caixa (min 50mm, max 120mm)
  const clientLineHeight = 5;
  const clientBoxHeight = Math.max(18, Math.min(42, clientDataLines.length * clientLineHeight + 2 * clientBoxPadding));
  
  // Desenhar borda
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, clientBoxY, contentWidth, clientBoxHeight);
  
  // Renderizar conteúdo
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  let lineY = clientBoxY + clientBoxPadding + 4;
  clientDataLines.forEach((item) => {
    pdf.setFont("helvetica", item.bold ? "bold" : "normal");
    pdf.text(item.text, margin + clientBoxPadding, lineY);
    lineY += clientLineHeight;
  });
  
  yPos = clientBoxY + clientBoxHeight + PDF_CONFIG.sectionSpacing;

  // ============ TÉCNICO (apenas nome, sem telefone) ============
  
  checkNewPage(20);

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Técnico responsável", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  const techBoxY = yPos;
  const techName = call.technicians?.full_name || "N/A";
  
  const techContentWidth = contentWidth - 2 * PDF_CONFIG.box.padding;
  const techLines = pdf.splitTextToSize(techName, techContentWidth);
  const techLineHeight = 5;
  const techBoxHeight = techLines.length * techLineHeight + 2 * PDF_CONFIG.box.padding;

  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, techBoxY, contentWidth, techBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  
  let techLineY = techBoxY + PDF_CONFIG.box.padding + 4;
  techLines.forEach((line: string) => {
    pdf.text(line, margin + PDF_CONFIG.box.padding, techLineY);
    techLineY += techLineHeight;
  });

  yPos = techBoxY + techBoxHeight + PDF_CONFIG.sectionSpacing;

  // ============ AGENDAMENTO (linha única compacta com tipo de serviço) ============
  
  checkNewPage(20);

  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.setFont("helvetica", "bold");
  pdf.text("Agendamento", pageWidth / 2, yPos, { align: "center" });
  yPos += 6;

  const schedBoxY = yPos;
  const schedParts = [];
  
  if (call.scheduled_date) {
    schedParts.push(`Data: ${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}`);
  }
  if (call.scheduled_time) {
    schedParts.push(`Hora: ${call.scheduled_time}`);
  }
  if (call.started_at) {
    schedParts.push(`Início em: ${format(new Date(call.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`);
  }
  if ((call as any).service_types?.name) {
    schedParts.push(`Tipo de Serviço: ${(call as any).service_types.name}`);
  }
  
  const schedLine = schedParts.join(' • ');
  
  const schedContentWidth = contentWidth - 2 * PDF_CONFIG.box.padding;
  const schedLines = pdf.splitTextToSize(schedLine, schedContentWidth);
  const schedLineHeight = 5;
  const schedBoxHeight = schedLines.length * schedLineHeight + 2 * PDF_CONFIG.box.padding;

  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.rect(margin, schedBoxY, contentWidth, schedBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  
  let schedLineY = schedBoxY + PDF_CONFIG.box.padding + 4;
  schedLines.forEach((line: string) => {
    pdf.text(line, margin + PDF_CONFIG.box.padding, schedLineY);
    schedLineY += schedLineHeight;
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

  // ============ ASSINATURAS (2 retângulos lado a lado, altura ~120px) ============
  
  const hasSignatures = (call.technician_signature_url || call.technician_signature_data) || 
                        (call.customer_signature_url || call.customer_signature_data);
  
  if (hasSignatures) {
    checkNewPage(60);
    
    // Verificar se há espaço suficiente para ambas as assinaturas (evitar quebra)
    const signaturesHeight = PDF_CONFIG.signature.boxHeight + 10;
    if (yPos + signaturesHeight > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
    
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.setFont("helvetica", "bold");
    pdf.text("Assinaturas", pageWidth / 2, yPos, { align: "center" });
    yPos += 6;

    const sigBoxWidth = contentWidth * PDF_CONFIG.signature.boxWidth;
    const sigGap = contentWidth * PDF_CONFIG.signature.gap;
    const sigBoxHeight = PDF_CONFIG.signature.boxHeight;

    // Retângulo TÉCNICO (esquerda)
    const techSigX = margin;
    const techSigY = yPos;
    
    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(techSigX, techSigY, sigBoxWidth, sigBoxHeight);
    
    // Título "TÉCNICO"
    pdf.setFontSize(PDF_CONFIG.fontSize.h3);
    pdf.setFont("helvetica", "bold");
    pdf.text("TÉCNICO", techSigX + sigBoxWidth / 2, techSigY + 5, { align: "center" });
    
    // Nome do técnico
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const techName = call.technicians?.full_name || "N/A";
    pdf.text(techName, techSigX + sigBoxWidth / 2, techSigY + 10, { align: "center" });
    
    // Assinatura do técnico (renderizada dentro do retângulo)
    if (call.technician_signature_url || call.technician_signature_data) {
      try {
        const techSigData = call.technician_signature_url 
          ? await loadImageAsBase64(call.technician_signature_url)
          : call.technician_signature_data;
        
        if (techSigData && techSigData.startsWith('data:image/')) {
          const sigImgHeight = 24;
          const sigImgY = techSigY + 14;
          pdf.addImage(techSigData, "PNG", techSigX + 4, sigImgY, sigBoxWidth - 8, sigImgHeight);
        }
      } catch (error) {
        console.error("Erro ao carregar assinatura do técnico:", error);
      }
    }
    
    // Data/hora da assinatura do técnico
    if (call.technician_signature_date) {
      pdf.setFontSize(PDF_CONFIG.fontSize.base - 1);
      pdf.text(
        format(new Date(call.technician_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        techSigX + sigBoxWidth / 2,
        techSigY + sigBoxHeight - 4,
        { align: "center" }
      );
    }

    // Retângulo CLIENTE (direita)
    const clientSigX = techSigX + sigBoxWidth + sigGap;
    const clientSigY = techSigY;
    
    pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
    pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
    pdf.rect(clientSigX, clientSigY, sigBoxWidth, sigBoxHeight);
    
    // Título "CLIENTE"
    pdf.setFontSize(PDF_CONFIG.fontSize.h3);
    pdf.setFont("helvetica", "bold");
    pdf.text("CLIENTE", clientSigX + sigBoxWidth / 2, clientSigY + 5, { align: "center" });
    
    // Nome e cargo do cliente
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const customerName = call.customer_name || call.clients?.full_name || "N/A";
    const customerPosition = call.customer_position || "";
    pdf.text(customerName, clientSigX + sigBoxWidth / 2, clientSigY + 10, { align: "center" });
    if (customerPosition) {
      pdf.text(customerPosition, clientSigX + sigBoxWidth / 2, clientSigY + 14, { align: "center" });
    }
    
    // Assinatura do cliente (renderizada dentro do retângulo)
    if (call.customer_signature_url || call.customer_signature_data) {
      try {
        const customerSigData = call.customer_signature_url 
          ? await loadImageAsBase64(call.customer_signature_url)
          : call.customer_signature_data;
        
        if (customerSigData && customerSigData.startsWith('data:image/')) {
          const sigImgHeight = 24;
          const sigImgY = clientSigY + (customerPosition ? 18 : 14);
          pdf.addImage(customerSigData, "PNG", clientSigX + 4, sigImgY, sigBoxWidth - 8, sigImgHeight);
        }
      } catch (error) {
        console.error("Erro ao carregar assinatura do cliente:", error);
      }
    }
    
    // Data/hora da assinatura do cliente
    if (call.customer_signature_date) {
      pdf.setFontSize(PDF_CONFIG.fontSize.base - 1);
      pdf.text(
        format(new Date(call.customer_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        clientSigX + sigBoxWidth / 2,
        clientSigY + sigBoxHeight - 4,
        { align: "center" }
      );
    }

    yPos = clientSigY + sigBoxHeight + 6;
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
