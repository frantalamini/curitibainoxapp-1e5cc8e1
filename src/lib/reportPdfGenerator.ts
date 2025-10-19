import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";

export const generateServiceCallReport = async (call: ServiceCall): Promise<jsPDF> => {
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

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * fontSize * 0.5);
  };

  // Helper function to add section title
  const addSectionTitle = (title: string, y: number) => {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.line(margin, y + 2, pageWidth - margin, y + 2);
    return y + 8;
  };

  // Helper function para adicionar card com fundo
  const addCard = (y: number, height: number, color: [number, number, number] = [249, 250, 251]) => {
    pdf.setFillColor(...color);
    pdf.roundedRect(margin - 5, y - 5, pageWidth - 2 * margin + 10, height, 3, 3, "F");
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin - 5, y - 5, pageWidth - 2 * margin + 10, height, 3, 3, "S");
  };

  // Helper function para seção com card
  const addSectionTitleWithCard = (title: string, y: number, icon: string = "") => {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(`${icon} ${title}`, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(2);
    pdf.line(margin, y + 2, margin + 40, y + 2);
    
    return y + 8;
  };

  // HEADER MODERNO COM GRADIENTE
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 45, "F");

  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 35, pageWidth, 10, "F");

  // LOGO (centralizada no topo)
  try {
    pdf.addImage(logoImage, "PNG", pageWidth / 2 - 25, 8, 50, 15);
  } catch (error) {
    console.error("Error loading logo:", error);
  }

  // TÍTULO ABAIXO DA LOGO
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELATÓRIO DE CHAMADO TÉCNICO", pageWidth / 2, 30, { align: "center" });

  // OS Number em destaque
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`OS #${call.id.substring(0, 8).toUpperCase()}`, pageWidth / 2, 38, { align: "center" });

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  yPos = 55;

  // Status Badge Moderno
  const statusMap: Record<string, { text: string; color: [number, number, number] }> = {
    pending: { text: "Aguardando Início", color: [251, 191, 36] },
    in_progress: { text: "Em Andamento", color: [59, 130, 246] },
    on_hold: { text: "Com Pendências", color: [234, 179, 8] },
    completed: { text: "Finalizado", color: [34, 197, 94] },
    cancelled: { text: "Cancelado", color: [239, 68, 68] },
  };

  const status = statusMap[call.status] || { text: call.status, color: [148, 163, 184] };

  pdf.setFillColor(...status.color);
  pdf.roundedRect(margin - 2, yPos - 4, 60, 8, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(status.text, margin + 2, yPos + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  yPos += 10;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += 10;

  // CLIENT INFORMATION COM CARD
  const clientCardStartY = yPos;
  yPos = addSectionTitleWithCard("INFORMAÇÕES DO CLIENTE", yPos, "👤");

  const clientDataStartY = yPos;
  pdf.setFontSize(10);
  pdf.text(`Nome: ${call.clients?.full_name || "N/A"}`, margin, yPos);
  yPos += 6;
  pdf.text(`Telefone: ${call.clients?.phone || "N/A"}`, margin, yPos);
  yPos += 6;
  if ((call.clients as any)?.email) {
    pdf.text(`E-mail: ${(call.clients as any).email}`, margin, yPos);
    yPos += 6;
  }
  if (call.clients?.address) {
    yPos = addText(`Endereço: ${call.clients.address}`, margin, yPos, pageWidth - 2 * margin);
    yPos += 4;
  }

  const clientCardHeight = yPos - clientDataStartY + 10;
  addCard(clientDataStartY - 3, clientCardHeight, [239, 246, 255]);

  yPos += 5;

  // TECHNICIAN INFORMATION COM CARD
  yPos = addSectionTitleWithCard("TÉCNICO RESPONSÁVEL", yPos, "👨‍🔧");
  
  const techDataStartY = yPos;
  pdf.text(`Nome: ${call.technicians?.full_name || "N/A"}`, margin, yPos);
  yPos += 6;
  pdf.text(`Telefone: ${call.technicians?.phone || "N/A"}`, margin, yPos);
  yPos += 6;

  const techCardHeight = yPos - techDataStartY + 10;
  addCard(techDataStartY - 3, techCardHeight, [254, 249, 195]);

  yPos += 5;

  // SCHEDULING COM CARD
  yPos = addSectionTitleWithCard("AGENDAMENTO", yPos, "📅");
  
  const schedDataStartY = yPos;
  pdf.text(
    `Data: ${format(new Date(call.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
    margin,
    yPos
  );
  yPos += 6;
  pdf.text(`Horário: ${call.scheduled_time}`, margin, yPos);
  yPos += 6;
  if (call.started_at) {
    pdf.text(
      `Iniciado em: ${format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      margin,
      yPos
    );
    yPos += 6;
  }
  if (call.service_types) {
    pdf.text(`Tipo de Serviço: ${call.service_types.name}`, margin, yPos);
    yPos += 6;
  }

  const schedCardHeight = yPos - schedDataStartY + 10;
  addCard(schedDataStartY - 3, schedCardHeight, [243, 244, 246]);

  yPos += 5;

  // EQUIPMENT
  yPos = addSectionTitle("EQUIPAMENTO", yPos);
  yPos = addText(call.equipment_description, margin, yPos, pageWidth - 2 * margin);
  yPos += 8;

  // PROBLEM DESCRIPTION
  if (call.problem_description) {
    yPos = addSectionTitle("DESCRIÇÃO DO PROBLEMA", yPos);
    yPos = addText(call.problem_description, margin, yPos, pageWidth - 2 * margin);
    yPos += 8;
  }

  // Check if we need a new page
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
  }

  // TECHNICAL DIAGNOSIS
  if (call.technical_diagnosis) {
    yPos = addSectionTitle("DIAGNÓSTICO TÉCNICO", yPos);
    yPos = addText(call.technical_diagnosis, margin, yPos, pageWidth - 2 * margin);
    yPos += 6;
    
    if (call.technical_diagnosis_audio_url) {
      pdf.setFontSize(9);
      pdf.setTextColor(59, 130, 246);
      pdf.text("🔊 Áudio disponível (link no documento digital)", margin, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
    }
    yPos += 5;
  }

  // PHOTOS BEFORE
  if (call.photos_before_urls && call.photos_before_urls.length > 0) {
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }
    yPos = addSectionTitle("REGISTRO FOTOGRÁFICO - ANTES", yPos);
    pdf.setFontSize(9);
    pdf.text(`Total de fotos: ${call.photos_before_urls.length}`, margin, yPos);
    yPos += 6;
    
    if (call.video_before_url) {
      pdf.text("📹 Vídeo disponível (link no documento digital)", margin, yPos);
      yPos += 6;
    }
    yPos += 5;
  }

  // PHOTOS AFTER
  if (call.photos_after_urls && call.photos_after_urls.length > 0) {
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }
    yPos = addSectionTitle("REGISTRO FOTOGRÁFICO - DEPOIS", yPos);
    pdf.setFontSize(9);
    pdf.text(`Total de fotos: ${call.photos_after_urls.length}`, margin, yPos);
    yPos += 6;
    
    if (call.video_after_url) {
      pdf.text("📹 Vídeo disponível (link no documento digital)", margin, yPos);
      yPos += 6;
    }
    yPos += 5;
  }

  // CHECKLIST COM VISUAL MODERNO
  if (call.checklist_responses && checklistItems.length > 0) {
    if (yPos > 220) {
      pdf.addPage();
      yPos = 20;
    }
    
    yPos = addSectionTitleWithCard("CHECKLIST DE VERIFICAÇÃO", yPos, "✓");
    
    const checklistDataStartY = yPos;
    pdf.setFontSize(9);
    
    const responses = call.checklist_responses as Record<string, boolean>;
    
    // Criar mapa de ID -> texto
    const itemTextMap = new Map(checklistItems.map(item => [item.id, item.text]));
    
    Object.entries(responses).forEach(([itemId, checked]) => {
      // Buscar texto da pergunta usando o ID
      const questionText = itemTextMap.get(itemId) || itemId;
      
      // Símbolo visual
      if (checked) {
        pdf.setTextColor(34, 197, 94);
        pdf.text("✓", margin + 2, yPos);
      } else {
        pdf.setTextColor(148, 163, 184);
        pdf.text("○", margin + 2, yPos);
      }
      
      pdf.setTextColor(0, 0, 0);
      
      // Texto da pergunta com word wrap
      const maxWidth = pageWidth - 2 * margin - 10;
      const lines = pdf.splitTextToSize(questionText, maxWidth);
      pdf.text(lines, margin + 8, yPos);
      
      yPos += lines.length * 5;
      
      // Verificar se precisa de nova página
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
    });
    
    // Card de fundo
    const checklistCardHeight = yPos - checklistDataStartY + 5;
    addCard(checklistDataStartY - 3, checklistCardHeight, [240, 253, 244]);
    
    yPos += 5;
  }

  // SIGNATURES - New page
  pdf.addPage();
  yPos = 20;

  // Technician Signature
  if (call.technician_signature_url || call.technician_signature_data) {
    yPos = addSectionTitle("ASSINATURA DO TÉCNICO", yPos);
    
    // Try to add signature image
    try {
      const signatureUrl = call.technician_signature_data || call.technician_signature_url;
      if (signatureUrl) {
        pdf.addImage(signatureUrl, "PNG", margin, yPos, 80, 30);
        yPos += 35;
      }
    } catch (error) {
      console.error("Error adding technician signature:", error);
      pdf.text("[Assinatura não disponível para impressão]", margin, yPos);
      yPos += 10;
    }
    
    pdf.setFontSize(10);
    pdf.text(call.technicians?.full_name || "N/A", margin, yPos);
    yPos += 6;
    
    if (call.technician_signature_date) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Data: ${format(new Date(call.technician_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        margin,
        yPos
      );
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
    }
    yPos += 10;
  }

  // Customer Signature
  if (call.customer_signature_url || call.customer_signature_data) {
    if (yPos > 200) {
      pdf.addPage();
      yPos = 20;
    }
    yPos = addSectionTitle("ASSINATURA DO CLIENTE", yPos);
    
    // Try to add signature image
    try {
      const signatureUrl = call.customer_signature_data || call.customer_signature_url;
      if (signatureUrl) {
        pdf.addImage(signatureUrl, "PNG", margin, yPos, 80, 30);
        yPos += 35;
      }
    } catch (error) {
      console.error("Error adding customer signature:", error);
      pdf.text("[Assinatura não disponível para impressão]", margin, yPos);
      yPos += 10;
    }
    
    pdf.setFontSize(10);
    if (call.customer_name) {
      pdf.text(call.customer_name, margin, yPos);
      yPos += 6;
    }
    
    if (call.customer_position) {
      pdf.setFontSize(9);
      pdf.text(`Cargo: ${call.customer_position}`, margin, yPos);
      yPos += 6;
    }
    
    if (call.customer_signature_date) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Data: ${format(new Date(call.customer_signature_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        margin,
        yPos
      );
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
    }
  }

  // FOOTER
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Página ${i} de ${pageCount} | Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return pdf;
};
