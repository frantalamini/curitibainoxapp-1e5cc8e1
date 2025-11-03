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

  // ============ CABEÇALHO ============
  
  // Logo à esquerda com altura fixa 40px
  addLogoToPdf(pdf, logoBase64, {
    x: margin,
    y: margin,
    maxWidth: PDF_CONFIG.logo.maxWidth,
    maxHeight: PDF_CONFIG.logo.maxHeight,
    align: 'left',
  });
  
  // Dados da empresa à direita
  const rightColumnWidth = 70;
  let tempY = margin;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(companyData.name.toUpperCase(), pageWidth - margin, tempY, { align: "right" });
  tempY += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  if (companyData.cnpj) {
    pdf.text(`CNPJ: ${companyData.cnpj}`, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.ie) {
    pdf.text(`IE: ${companyData.ie}`, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.website) {
    pdf.text(companyData.website, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.email) {
    pdf.text(companyData.email, pageWidth - margin, tempY, { align: "right" });
    tempY += 4;
  }
  if (companyData.phone) {
    pdf.text(companyData.phone, pageWidth - margin, tempY, { align: "right" });
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

  // Linha horizontal fina
  pdf.setLineWidth(0.35);
  pdf.setDrawColor(201, 206, 214);  // #C9CED6
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;
  
  // Título central
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text(
    `ORDEM DE SERVIÇO Nº ${call.os_number}`,
    pageWidth / 2, 
    yPos, 
    { align: "center" }
  );
  yPos += 6;
  
  // Linha horizontal após título
  pdf.setLineWidth(0.35);
  pdf.setDrawColor(201, 206, 214);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ============ SEÇÃO CLIENTE + QUADRO DE DADOS DA OS ============
  
  const col1Width = contentWidth * 0.62;
  const col2Width = contentWidth * 0.38;
  const col2X = margin + col1Width + 4;

  // Título "CLIENTE" (caixa-alta)
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("CLIENTE", margin, yPos);
  yPos += 6;

  const clientBoxY = yPos;
  const clientLines: string[] = [];

  // Nome / Razão Social
  if (call.clients?.full_name) {
    clientLines.push(call.clients.full_name);
  }

  // Nome Fantasia (se diferente)
  if ((call.clients as any)?.nome_fantasia && 
      (call.clients as any).nome_fantasia !== call.clients?.full_name) {
    clientLines.push(`Nome fantasia: ${(call.clients as any).nome_fantasia}`);
  }

  // CPF/CNPJ
  if ((call.clients as any)?.cpf_cnpj) {
    const doc = (call.clients as any).cpf_cnpj;
    const label = doc.replace(/\D/g, '').length <= 11 ? 'CPF' : 'CNPJ';
    clientLines.push(`${label}: ${doc}`);
  }

  // IE
  if ((call.clients as any)?.state_registration) {
    clientLines.push(`IE: ${(call.clients as any).state_registration}`);
  }

  // Endereço completo
  if (call.clients?.address) {
    const addressLines = pdf.splitTextToSize(
      `Endereço: ${call.clients.address}`,
      col1Width - 8
    );
    clientLines.push(...addressLines);
  }

  // Telefone
  if (call.clients?.phone) {
    clientLines.push(`Telefone: ${call.clients.phone}`);
  }

  // Email
  if ((call.clients as any)?.email) {
    clientLines.push(`E-mail: ${(call.clients as any).email}`);
  }

  // Altura dinâmica da caixa
  const clientBoxHeight = Math.max(clientLines.length * 5 + 8, 60);

  // Desenhar borda
  pdf.setDrawColor(201, 206, 214);
  pdf.setLineWidth(0.35);
  pdf.rect(margin, clientBoxY, col1Width, clientBoxHeight);

  // Conteúdo
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let lineY = clientBoxY + 6;
  clientLines.forEach(line => {
    pdf.text(line, margin + 4, lineY);
    lineY += 5;
  });

  // ===== QUADRO LATERAL: DADOS DA OS =====

  const osDataY = clientBoxY;
  const rowHeight = 10;
  const labelWidth = 50;

  const statusMap: Record<string, string> = {
    pending: "Aguardando",
    in_progress: "Em Andamento",
    on_hold: "Pendente",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };

  const tableData = [
    { label: "Nº OS", value: call.os_number },
    { label: "Data Emissão", value: format(new Date(call.created_at), "dd/MM/yyyy", { locale: ptBR }) },
    { label: "Status", value: statusMap[call.status] || call.status },
    { label: "Data Prevista", value: format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR }) },
  ];

  // Adicionar data de finalização se status for "completed"
  if (call.status === 'completed' && call.updated_at) {
    tableData.push({
      label: "Data Finalização",
      value: format(new Date(call.updated_at), "dd/MM/yyyy", { locale: ptBR })
    });
  }

  let currentY = osDataY;

  tableData.forEach(row => {
    // Borda das células
    pdf.setDrawColor(201, 206, 214);
    pdf.setLineWidth(0.35);
    pdf.rect(col2X, currentY, labelWidth, rowHeight);
    pdf.rect(col2X + labelWidth, currentY, col2Width - labelWidth, rowHeight);

    // Label (negrito)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(row.label, col2X + 3, currentY + 6.5);

    // Valor (normal)
    pdf.setFont("helvetica", "normal");
    const valueText = String(row.value);
    const valueLines = pdf.splitTextToSize(valueText, col2Width - labelWidth - 6);
    pdf.text(valueLines, col2X + labelWidth + 3, currentY + 6.5);

    currentY += rowHeight;
  });

  yPos = Math.max(clientBoxY + clientBoxHeight, currentY) + 10;

  // ============ TÉCNICO RESPONSÁVEL ============
  
  checkNewPage(25);

  // Título
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("TÉCNICO RESPONSÁVEL", margin, yPos);
  yPos += 6;

  const techBoxY = yPos;
  const techText = call.technicians?.full_name || "N/A";  // ✅ Apenas nome

  const techLines = pdf.splitTextToSize(techText, contentWidth - 8);
  const techBoxHeight = techLines.length * 5 + 8;

  // Borda
  pdf.setDrawColor(201, 206, 214);
  pdf.setLineWidth(0.35);
  pdf.rect(margin, techBoxY, contentWidth, techBoxHeight);

  // Conteúdo
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let techLineY = techBoxY + 6;
  techLines.forEach((line: string) => {
    pdf.text(line, margin + 4, techLineY);
    techLineY += 5;
  });

  yPos = techBoxY + techBoxHeight + 8;

  // ============ AGENDAMENTO ============
  
  checkNewPage(25);

  // Título
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("AGENDAMENTO", margin, yPos);
  yPos += 6;

  const schedBoxY = yPos;
  const schedLines: string[] = [];

  schedLines.push(`Data: ${format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}`);
  schedLines.push(`Hora: ${call.scheduled_time}`);
  
  if (call.started_at) {
    const startTime = format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    schedLines.push(`Início: ${startTime}`);
  }

  const schedBoxHeight = schedLines.length * 5 + 8;

  pdf.setDrawColor(201, 206, 214);
  pdf.setLineWidth(0.35);
  pdf.rect(margin, schedBoxY, contentWidth, schedBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let schedLineY = schedBoxY + 6;
  schedLines.forEach(line => {
    pdf.text(line, margin + 4, schedLineY);
    schedLineY += 5;
  });

  yPos = schedBoxY + schedBoxHeight + 8;

  // ============ EQUIPAMENTO ============
  
  checkNewPage(25);

  // Título
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("EQUIPAMENTO", margin, yPos);
  yPos += 6;

  const equipBoxY = yPos;
  const equipLines: string[] = [];
  
  equipLines.push(call.equipment_description || "N/A");
  
  if (call.equipment_serial_number) {
    equipLines.push(`Nº de série: ${call.equipment_serial_number}`);
  }

  const equipBoxHeight = equipLines.length * 5 + 8;

  pdf.setDrawColor(201, 206, 214);
  pdf.setLineWidth(0.35);
  pdf.rect(margin, equipBoxY, contentWidth, equipBoxHeight);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  let equipLineY = equipBoxY + 6;
  equipLines.forEach((line: string) => {
    const splitLines = pdf.splitTextToSize(line, contentWidth - 8);
    splitLines.forEach((splitLine: string) => {
      pdf.text(splitLine, margin + 4, equipLineY);
      equipLineY += 5;
    });
  });

  yPos = equipBoxY + equipBoxHeight + 8;

  // ============ PROBLEMA ============
  
  if (shouldRenderSection(call.problem_description)) {
    checkNewPage(25);

    // Título
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("PROBLEMA", margin, yPos);
    yPos += 6;

    const problemBoxY = yPos;
    const problemLines = pdf.splitTextToSize(call.problem_description, contentWidth - 8);
    const problemBoxHeight = problemLines.length * 5 + 8;

    pdf.setDrawColor(201, 206, 214);
    pdf.setLineWidth(0.35);
    pdf.rect(margin, problemBoxY, contentWidth, problemBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    let problemLineY = problemBoxY + 6;
    problemLines.forEach((line: string) => {
      pdf.text(line, margin + 4, problemLineY);
      problemLineY += 5;
    });

    yPos = problemBoxY + problemBoxHeight + 8;
  }

  // ============ SERVIÇOS EXECUTADOS ============
  
  if (shouldRenderSection(call.technical_diagnosis)) {
    checkNewPage(25);

    // Título
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("SERVIÇOS EXECUTADOS", margin, yPos);
    yPos += 6;

    const actionsBoxY = yPos;
    const actionsLines = pdf.splitTextToSize(call.technical_diagnosis, contentWidth - 8);
    let actionsBoxHeight = actionsLines.length * 5 + 8;

    // Adicionar espaço para indicador de áudio se houver
    if (call.technical_diagnosis_audio_url) {
      actionsBoxHeight += 6;
    }

    pdf.setDrawColor(201, 206, 214);
    pdf.setLineWidth(0.35);
    pdf.rect(margin, actionsBoxY, contentWidth, actionsBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    let actionsLineY = actionsBoxY + 6;
    actionsLines.forEach((line: string) => {
      pdf.text(line, margin + 4, actionsLineY);
      actionsLineY += 5;
    });

    // Audio indicator if available
    if (call.technical_diagnosis_audio_url) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text("🎤 Áudio disponível no sistema", margin + 4, actionsLineY);
      pdf.setTextColor(17, 17, 17);
    }

    yPos = actionsBoxY + actionsBoxHeight + 8;
  }

  // ============ OBSERVAÇÕES (VISÍVEIS AO CLIENTE) ============
  
  if (shouldRenderSection(call.notes)) {
    checkNewPage(25);

    // Título
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("OBSERVAÇÕES (VISÍVEIS AO CLIENTE)", margin, yPos);
    yPos += 6;

    const notesBoxY = yPos;
    const notesLines = pdf.splitTextToSize(call.notes, contentWidth - 8);
    const notesBoxHeight = notesLines.length * 5 + 8;

    pdf.setDrawColor(201, 206, 214);
    pdf.setLineWidth(0.35);
    pdf.rect(margin, notesBoxY, contentWidth, notesBoxHeight);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    let notesLineY = notesBoxY + 6;
    notesLines.forEach((line: string) => {
      pdf.text(line, margin + 4, notesLineY);
      notesLineY += 5;
    });

    yPos = notesBoxY + notesBoxHeight + 8;
  }

  // ⚠️ IMPORTANTE: NÃO INCLUIR call.internal_notes_text

  // ============ CHECKLIST ============
  
  if (call.checklist_responses && checklistItems.length > 0) {
    checkNewPage(30);

    // Título
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("CHECKLIST", margin, yPos);
    yPos += 6;
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    const responses = call.checklist_responses as Record<string, boolean>;
    const itemTextMap = new Map(checklistItems.map(item => [item.id, item.text]));
    
    const rowHeight = 8;
    let rowY = yPos;
    
    Object.entries(responses).forEach(([itemId, checked], index) => {
      checkNewPage(rowHeight + 5);
      if (yPos !== rowY) rowY = yPos;
      
      const questionText = `${index + 1}) ${itemTextMap.get(itemId) || itemId}`;
      const answer = checked ? "Sim" : "Não";
      
      // Borda da linha
      pdf.setDrawColor(201, 206, 214);
      pdf.setLineWidth(0.35);
      pdf.rect(margin, rowY - 4, contentWidth, rowHeight);
      
      // Pergunta (esquerda)
      const questionLines = pdf.splitTextToSize(questionText, contentWidth - 30);
      pdf.text(questionLines, margin + 3, rowY);
      
      // Resposta (direita)
      pdf.text(answer, pageWidth - margin - 20, rowY);
      
      rowY += Math.max(rowHeight, questionLines.length * 4.5);
    });
    
    yPos = rowY + 8;
  }

  // ============ FOTOS (Grade 3x3, aspect-ratio 4:3) ============
  
  if (shouldRenderSection(call.photos_before_urls)) {
    const validUrls = call.photos_before_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      checkNewPage(60);

      // Título
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("FOTOS", margin, yPos);
      yPos += 6;
      
      const perRow = 3;
      const spacing = 4;
      const photoWidth = (contentWidth - spacing * (perRow - 1)) / perRow;
      const photoHeight = photoWidth * 0.75;  // aspect-ratio 4:3
      
      let xPos = margin;
      let photosInRow = 0;
      
      for (const photoUrl of validUrls) {
        // Verificar se cabe na página atual
        if (photosInRow === 0) {
          checkNewPage(photoHeight + 15);
        }
        
        const imageData = await loadImageAsBase64(photoUrl);
        
        if (imageData) {
          try {
            let format = 'JPEG';
            if (imageData.startsWith('data:image/png')) format = 'PNG';
            else if (imageData.startsWith('data:image/webp')) format = 'WEBP';
            
            // Adicionar imagem com aspect-ratio preservado
            pdf.addImage(imageData, format, xPos, yPos, photoWidth, photoHeight);
            
            // Borda fina
            pdf.setLineWidth(0.35);
            pdf.setDrawColor(201, 206, 214);
            pdf.rect(xPos, yPos, photoWidth, photoHeight);
          } catch (error) {
            console.error("Erro ao adicionar foto:", error);
            // Placeholder cinza
            pdf.setFillColor(240, 240, 240);
            pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
          }
        }
        
        photosInRow++;
        
        if (photosInRow === perRow) {
          yPos += photoHeight + spacing;
          xPos = margin;
          photosInRow = 0;
        } else {
          xPos += photoWidth + spacing;
        }
      }
      
      // Ajustar yPos se linha incompleta
      if (photosInRow > 0) {
        yPos += photoHeight + spacing;
      }
      
      yPos += 8;
    }
  }

  // Fotos após o serviço (continua na mesma seção se houver)
  if (shouldRenderSection(call.photos_after_urls)) {
    const validUrls = call.photos_after_urls!.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );
    
    if (validUrls.length > 0) {
      const perRow = 3;
      const spacing = 4;
      const photoWidth = (contentWidth - spacing * (perRow - 1)) / perRow;
      const photoHeight = photoWidth * 0.75;  // aspect-ratio 4:3
      
      let xPos = margin;
      let photosInRow = 0;
      
      for (const photoUrl of validUrls) {
        // Verificar se cabe na página atual
        if (photosInRow === 0) {
          checkNewPage(photoHeight + 15);
        }
        
        const imageData = await loadImageAsBase64(photoUrl);
        
        if (imageData) {
          try {
            let format = 'JPEG';
            if (imageData.startsWith('data:image/png')) format = 'PNG';
            else if (imageData.startsWith('data:image/webp')) format = 'WEBP';
            
            pdf.addImage(imageData, format, xPos, yPos, photoWidth, photoHeight);
            
            // Borda fina
            pdf.setLineWidth(0.35);
            pdf.setDrawColor(201, 206, 214);
            pdf.rect(xPos, yPos, photoWidth, photoHeight);
          } catch (error) {
            console.error("Erro ao adicionar foto:", error);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
          }
        }
        
        photosInRow++;
        
        if (photosInRow === perRow) {
          yPos += photoHeight + spacing;
          xPos = margin;
          photosInRow = 0;
        } else {
          xPos += photoWidth + spacing;
        }
      }
      
      if (photosInRow > 0) {
        yPos += photoHeight + spacing;
      }
      
      yPos += 8;
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

  // ============ ASSINATURAS (com linha + imagem + legenda) ============
  
  const hasSignatures = (call.technician_signature_url || call.technician_signature_data) || 
                        (call.customer_signature_url || call.customer_signature_data);
  
  if (hasSignatures) {
    checkNewPage(70);
    
    // Linha separadora
    pdf.setLineWidth(0.35);
    pdf.setDrawColor(201, 206, 214);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Título
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("ASSINATURAS", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    pdf.setFont("helvetica", "normal");
    
    const sigColWidth = (contentWidth - 8) / 2;
    const sigCol2X = margin + sigColWidth + 8;
    
    const sigStartY = yPos;
    let techY = sigStartY;
    let clientY = sigStartY;
    
    // COLUNA 1: Técnico
    if (call.technician_signature_url || call.technician_signature_data) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("TÉCNICO", margin, techY);
      techY += 5;
      pdf.setFont("helvetica", "normal");
      
      const signatureData = call.technician_signature_url 
        ? await loadImageAsBase64(call.technician_signature_url)
        : call.technician_signature_data;
      
      // Renderizar imagem da assinatura (escalada max 180x60px)
      if (signatureData && signatureData.startsWith('data:image/')) {
        try {
          const sigImgWidth = Math.min(sigColWidth * 0.9, 63);  // ~180px
          const sigImgHeight = 21;  // ~60px
          
          pdf.addImage(signatureData, "PNG", margin, techY, sigImgWidth, sigImgHeight);
          techY += sigImgHeight + 2;
        } catch (error) {
          console.error("Erro ao adicionar assinatura técnico:", error);
        }
      }
      
      // Linha horizontal (~70-80mm)
      const lineWidth = Math.min(sigColWidth * 0.9, 70);
      pdf.setLineWidth(0.35);
      pdf.setDrawColor(201, 206, 214);
      pdf.line(margin, techY, margin + lineWidth, techY);
      techY += 4;
      
      // Legenda abaixo da linha
      pdf.setFontSize(9);
      pdf.text(`Assinado por: ${call.technicians?.full_name || "N/A"}`, margin, techY);
      techY += 4;
      
      if (call.technician_signature_date) {
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          margin,
          techY
        );
        pdf.setTextColor(17, 17, 17);
        techY += 4;
      }
    }
    
    // COLUNA 2: Cliente
    if (call.customer_signature_url || call.customer_signature_data) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("CLIENTE", sigCol2X, clientY);
      clientY += 5;
      pdf.setFont("helvetica", "normal");
      
      const signatureData = call.customer_signature_url 
        ? await loadImageAsBase64(call.customer_signature_url)
        : call.customer_signature_data;
      
      // Renderizar imagem da assinatura
      if (signatureData && signatureData.startsWith('data:image/')) {
        try {
          const sigImgWidth = Math.min(sigColWidth * 0.9, 63);
          const sigImgHeight = 21;
          
          pdf.addImage(signatureData, "PNG", sigCol2X, clientY, sigImgWidth, sigImgHeight);
          clientY += sigImgHeight + 2;
        } catch (error) {
          console.error("Erro ao adicionar assinatura cliente:", error);
        }
      }
      
      // Linha horizontal
      const lineWidth = Math.min(sigColWidth * 0.9, 70);
      pdf.setLineWidth(0.35);
      pdf.setDrawColor(201, 206, 214);
      pdf.line(sigCol2X, clientY, sigCol2X + lineWidth, clientY);
      clientY += 4;
      
      // Legenda
      pdf.setFontSize(9);
      pdf.text(
        `Assinado por: ${call.customer_name || call.clients?.full_name || "N/A"}`,
        sigCol2X,
        clientY
      );
      clientY += 4;
      
      if (call.customer_position) {
        pdf.text(`Cargo: ${call.customer_position}`, sigCol2X, clientY);
        clientY += 4;
      }
      
      if (call.customer_signature_date) {
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          sigCol2X,
          clientY
        );
        pdf.setTextColor(17, 17, 17);
        clientY += 4;
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
