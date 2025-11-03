import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";
import { loadSystemLogoForPdf, addLogoToPdf } from "./pdfLogoHelper";
import { logger } from "./logger";

// Configuração do layout A4 - Template minimalista
const PDF_CONFIG = {
  margin: 25,
  fontSize: {
    h1: 13,
    h2: 12,
    base: 11,
    small: 9,
    footer: 8,
  },
  lineHeight: 1.25,
  sectionSpacing: 8,
  colors: {
    black: [17, 17, 17] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [240, 240, 240] as [number, number, number],
    border: [201, 206, 214] as [number, number, number],
  },
  photo: {
    perRow: 3,
    spacing: 4,
  },
  signature: {
    maxWidth: 63,
    maxHeight: 21,
    spacing: 8,
    lineWidth: 70,
  },
  box: {
    borderWidth: 0.35,
    borderColor: [201, 206, 214] as [number, number, number],
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
    maxHeight: 40,
  },
};

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

const getCompanyData = async () => {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("*")
      .single();
    
    const settings = data as any;
    return {
      name: settings?.company_name || "Curitiba Inox",
      cnpj: settings?.company_cnpj || "",
      phone: settings?.company_phone || "",
      email: settings?.company_email || "",
      website: settings?.company_website || "",
      address: settings?.company_address || "",
      ie: settings?.company_ie || "",
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

const statusMap = {
  pending: "Aguardando",
  in_progress: "Em Andamento",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export const generateServiceCallReport = async (call: ServiceCall): Promise<jsPDF> => {
  const logoBase64 = await loadSystemLogoForPdf();
  const companyData = await getCompanyData();
  
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
  const contentWidth = pageWidth - (PDF_CONFIG.margin * 2);
  let yPos = PDF_CONFIG.margin;
  
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - PDF_CONFIG.margin) {
      pdf.addPage();
      yPos = PDF_CONFIG.margin;
      return true;
    }
    return false;
  };
  
  // CABEÇALHO: Logo + Dados da empresa
  if (logoBase64) {
    addLogoToPdf(pdf, logoBase64, {
      x: PDF_CONFIG.margin,
      y: yPos,
      maxWidth: PDF_CONFIG.logo.maxWidth,
      maxHeight: PDF_CONFIG.logo.maxHeight,
      align: 'left',
    });
  }
  
  // Dados da empresa (direita)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(companyData.name.toUpperCase(), pageWidth - PDF_CONFIG.margin, yPos, { align: 'right' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  let companyYPos = yPos + 5;
  if (companyData.cnpj) {
    pdf.text(`CNPJ: ${companyData.cnpj}`, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
    companyYPos += 4;
  }
  if (companyData.ie) {
    pdf.text(`IE: ${companyData.ie}`, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
    companyYPos += 4;
  }
  if (companyData.address) {
    pdf.text(companyData.address, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
    companyYPos += 4;
  }
  if (companyData.website) {
    pdf.text(companyData.website, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
    companyYPos += 4;
  }
  if (companyData.email) {
    pdf.text(companyData.email, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
    companyYPos += 4;
  }
  if (companyData.phone) {
    pdf.text(companyData.phone, pageWidth - PDF_CONFIG.margin, companyYPos, { align: 'right' });
  }
  
  yPos += PDF_CONFIG.logo.maxHeight + 8;
  
  // TÍTULO: ORDEM DE SERVIÇO
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  pdf.line(PDF_CONFIG.margin, yPos, pageWidth - PDF_CONFIG.margin, yPos);
  
  yPos += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(PDF_CONFIG.fontSize.h1);
  pdf.text(`ORDEM DE SERVIÇO Nº ${call.os_number}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 6;
  pdf.line(PDF_CONFIG.margin, yPos, pageWidth - PDF_CONFIG.margin, yPos);
  yPos += PDF_CONFIG.sectionSpacing;
  
  // LAYOUT 2 COLUNAS: Cliente + Dados OS
  checkNewPage(40);
  
  const col1Width = contentWidth * 0.6;
  const col2Width = contentWidth * 0.38;
  const colGap = contentWidth * 0.02;
  
  // Coluna 1: CLIENTE
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(PDF_CONFIG.fontSize.h2);
  pdf.text('CLIENTE', PDF_CONFIG.margin, yPos);
  
  const clientBoxY = yPos + 3;
  pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
  pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
  
  const client = call.clients as any;
  let clientText = '';
  if (client?.full_name) clientText += `${client.full_name}\n`;
  if (client?.cpf_cnpj) clientText += `CNPJ/CPF: ${client.cpf_cnpj}\n`;
  if (client?.state_registration) clientText += `IE: ${client.state_registration}\n`;
  if (client?.address) clientText += `${client.address}\n`;
  if (client?.phone) clientText += `Tel: ${client.phone}\n`;
  if (client?.email) clientText += `Email: ${client.email}`;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(PDF_CONFIG.fontSize.base);
  const clientLines = pdf.splitTextToSize(clientText.trim(), col1Width - 8);
  const clientBoxHeight = Math.max(clientLines.length * 5 + 4, 30);
  
  pdf.rect(PDF_CONFIG.margin, clientBoxY, col1Width, clientBoxHeight);
  pdf.text(clientLines, PDF_CONFIG.margin + 4, clientBoxY + 6);
  
  // Coluna 2: DADOS DA OS (tabela)
  const col2X = PDF_CONFIG.margin + col1Width + colGap;
  
  const osData = [
    ['Nº OS', String(call.os_number)],
    ['Data Emissão', format(new Date(call.created_at), 'dd/MM/yyyy', { locale: ptBR })],
    ['Status', statusMap[call.status] || call.status],
    ['Data Prevista', format(new Date(call.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })],
  ];
  
  if (call.status === 'completed' && call.updated_at) {
    osData.push(['Finalização', format(new Date(call.updated_at), 'dd/MM/yyyy', { locale: ptBR })]);
  }
  
  pdf.rect(col2X, clientBoxY, col2Width, clientBoxHeight);
  
  let osRowY = clientBoxY;
  const rowHeight = clientBoxHeight / osData.length;
  
  osData.forEach((row, index) => {
    if (index > 0) {
      pdf.line(col2X, osRowY, col2X + col2Width, osRowY);
    }
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(row[0], col2X + 2, osRowY + rowHeight / 2 + 1.5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[1], col2X + col2Width - 2, osRowY + rowHeight / 2 + 1.5, { align: 'right' });
    
    osRowY += rowHeight;
  });
  
  yPos = clientBoxY + clientBoxHeight + PDF_CONFIG.sectionSpacing;
  
  // TÉCNICO RESPONSÁVEL
  if (call.technicians?.full_name) {
    checkNewPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('TÉCNICO RESPONSÁVEL', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    pdf.text(call.technicians.full_name, PDF_CONFIG.margin, yPos);
    yPos += PDF_CONFIG.sectionSpacing;
  }
  
  // TIPO DE SERVIÇO
  if (call.service_types?.name) {
    checkNewPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('TIPO DE SERVIÇO', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    pdf.text(call.service_types.name, PDF_CONFIG.margin, yPos);
    yPos += PDF_CONFIG.sectionSpacing;
  }
  
  // EQUIPAMENTO
  if (call.equipment_description) {
    checkNewPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('EQUIPAMENTO', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const equipLines = pdf.splitTextToSize(call.equipment_description, contentWidth - 10);
    pdf.text(equipLines, PDF_CONFIG.margin, yPos);
    yPos += equipLines.length * 5 + PDF_CONFIG.sectionSpacing;
  }
  
  // NÚMERO DE SÉRIE
  if (call.equipment_serial_number) {
    checkNewPage();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('NÚMERO DE SÉRIE', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    pdf.text(call.equipment_serial_number, PDF_CONFIG.margin, yPos);
    yPos += PDF_CONFIG.sectionSpacing;
  }
  
  // PROBLEMA RELATADO
  if (call.problem_description) {
    checkNewPage(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('PROBLEMA RELATADO', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const problemLines = pdf.splitTextToSize(call.problem_description, contentWidth - 10);
    pdf.text(problemLines, PDF_CONFIG.margin, yPos);
    yPos += problemLines.length * 5 + PDF_CONFIG.sectionSpacing;
  }
  
  // DIAGNÓSTICO TÉCNICO
  if (call.technical_diagnosis) {
    checkNewPage(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('DIAGNÓSTICO TÉCNICO', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const diagLines = pdf.splitTextToSize(call.technical_diagnosis, contentWidth - 10);
    pdf.text(diagLines, PDF_CONFIG.margin, yPos);
    yPos += diagLines.length * 5 + PDF_CONFIG.sectionSpacing;
  }
  
  // OBSERVAÇÕES
  if (call.notes) {
    checkNewPage(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('OBSERVAÇÕES', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.base);
    const notesLines = pdf.splitTextToSize(call.notes, contentWidth - 10);
    pdf.text(notesLines, PDF_CONFIG.margin, yPos);
    yPos += notesLines.length * 5 + PDF_CONFIG.sectionSpacing;
  }
  
  // CHECKLIST
  if (checklistItems.length > 0 && call.checklist_responses) {
    checkNewPage(40);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('CHECKLIST', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(PDF_CONFIG.fontSize.small);
    
    checklistItems.forEach((item) => {
      checkNewPage();
      const response = call.checklist_responses?.[item.id];
      const status = response === true ? '☑' : response === false ? '☐' : '—';
      pdf.text(`${status} ${item.text}`, PDF_CONFIG.margin + 2, yPos);
      yPos += 5;
    });
    
    yPos += PDF_CONFIG.sectionSpacing;
  }
  
  // FOTOS (Grid 3x3)
  const allPhotos = [
    ...(call.photos_before_urls || []),
    ...(call.photos_after_urls || []),
  ].filter(url => url && url.startsWith('http'));
  
  if (allPhotos.length > 0) {
    checkNewPage(60);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(PDF_CONFIG.fontSize.h2);
    pdf.text('FOTOS', PDF_CONFIG.margin, yPos);
    yPos += 5;
    
    const photoSize = (contentWidth - (PDF_CONFIG.photo.spacing * 2)) / PDF_CONFIG.photo.perRow;
    let photosInRow = 0;
    let photoRowY = yPos;
    
    for (const photoUrl of allPhotos) {
      if (photosInRow === 0) {
        checkNewPage(photoSize + 10);
        photoRowY = yPos;
      }
      
      const photoX = PDF_CONFIG.margin + (photosInRow * (photoSize + PDF_CONFIG.photo.spacing));
      
      try {
        const photoBase64 = await loadImageAsBase64(photoUrl);
        if (photoBase64) {
          pdf.setDrawColor(...PDF_CONFIG.box.borderColor);
          pdf.setLineWidth(PDF_CONFIG.box.borderWidth);
          pdf.rect(photoX, photoRowY, photoSize, photoSize);
          pdf.addImage(photoBase64, 'JPEG', photoX, photoRowY, photoSize, photoSize);
        }
      } catch (error) {
        console.error('Erro ao adicionar foto:', error);
      }
      
      photosInRow++;
      if (photosInRow >= PDF_CONFIG.photo.perRow) {
        photosInRow = 0;
        yPos += photoSize + PDF_CONFIG.photo.spacing;
      }
    }
    
    if (photosInRow > 0) {
      yPos += photoSize + PDF_CONFIG.photo.spacing;
    }
    
    yPos += PDF_CONFIG.sectionSpacing;
  }
  
  // ASSINATURAS
  const hasTechSig = call.technician_signature_url || call.technician_signature_data;
  const hasClientSig = call.customer_signature_url || call.customer_signature_data;
  
  if (hasTechSig || hasClientSig) {
    checkNewPage(60);
    
    yPos += 10;
    
    const sigWidth = (contentWidth - 12) / 2;
    
    // Técnico (esquerda)
    if (hasTechSig) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(PDF_CONFIG.fontSize.base);
      pdf.text('TÉCNICO', PDF_CONFIG.margin + sigWidth / 2, yPos, { align: 'center' });
      
      const sigData = call.technician_signature_url || call.technician_signature_data;
      if (sigData) {
        try {
          pdf.addImage(sigData, 'PNG', PDF_CONFIG.margin + (sigWidth - PDF_CONFIG.signature.maxWidth) / 2, yPos + 5, PDF_CONFIG.signature.maxWidth, PDF_CONFIG.signature.maxHeight);
        } catch (error) {
          console.error('Erro ao adicionar assinatura técnico:', error);
        }
      }
      
      const lineY = yPos + 5 + PDF_CONFIG.signature.maxHeight + 4;
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(PDF_CONFIG.margin + (sigWidth - PDF_CONFIG.signature.lineWidth) / 2, lineY, PDF_CONFIG.margin + (sigWidth + PDF_CONFIG.signature.lineWidth) / 2, lineY);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(PDF_CONFIG.fontSize.footer);
      const techName = call.technicians?.full_name || 'N/A';
      const techDate = call.technician_signature_date ? format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
      pdf.text(techName, PDF_CONFIG.margin + sigWidth / 2, lineY + 4, { align: 'center' });
      if (techDate) {
        pdf.text(techDate, PDF_CONFIG.margin + sigWidth / 2, lineY + 8, { align: 'center' });
      }
    }
    
    // Cliente (direita)
    if (hasClientSig) {
      const clientX = PDF_CONFIG.margin + sigWidth + 12;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(PDF_CONFIG.fontSize.base);
      pdf.text('CLIENTE', clientX + sigWidth / 2, yPos, { align: 'center' });
      
      const sigData = call.customer_signature_url || call.customer_signature_data;
      if (sigData) {
        try {
          pdf.addImage(sigData, 'PNG', clientX + (sigWidth - PDF_CONFIG.signature.maxWidth) / 2, yPos + 5, PDF_CONFIG.signature.maxWidth, PDF_CONFIG.signature.maxHeight);
        } catch (error) {
          console.error('Erro ao adicionar assinatura cliente:', error);
        }
      }
      
      const lineY = yPos + 5 + PDF_CONFIG.signature.maxHeight + 4;
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(clientX + (sigWidth - PDF_CONFIG.signature.lineWidth) / 2, lineY, clientX + (sigWidth + PDF_CONFIG.signature.lineWidth) / 2, lineY);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(PDF_CONFIG.fontSize.footer);
      const clientName = call.customer_name || call.clients?.full_name || 'N/A';
      const clientPosition = call.customer_position || '';
      const clientDate = call.customer_signature_date ? format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '';
      
      pdf.text(clientName, clientX + sigWidth / 2, lineY + 4, { align: 'center' });
      if (clientPosition) {
        pdf.text(`Cargo: ${clientPosition}`, clientX + sigWidth / 2, lineY + 8, { align: 'center' });
      }
      if (clientDate) {
        pdf.text(clientDate, clientX + sigWidth / 2, lineY + (clientPosition ? 12 : 8), { align: 'center' });
      }
    }
  }
  
  return pdf;
};

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
