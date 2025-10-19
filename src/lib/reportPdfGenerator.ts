import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";
import { supabase } from "@/integrations/supabase/client";

// Helper function to load images as Base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Erro ao carregar imagem:", error);
    return null;
  }
};

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
    // Linha separadora antes
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
    
    // Título em maiúsculas
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(title.toUpperCase(), margin, y);
    
    // Linha separadora depois
    y += 2;
    pdf.line(margin, y, pageWidth - margin, y);
    pdf.setFont("helvetica", "normal");
    
    return y + 6;
  };

  // CABEÇALHO SIMPLES
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELATÓRIO DE CHAMADO TÉCNICO", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  pdf.setFontSize(11);
  pdf.text(`OS #${call.id.substring(0, 8).toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Linha separadora dupla
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 1;
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  // Status e data
  const statusMap: Record<string, string> = {
    pending: "Aguardando Início",
    in_progress: "Em Andamento",
    on_hold: "Com Pendências",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };

  pdf.text(`Status: ${statusMap[call.status] || call.status}`, margin, yPos);
  yPos += 6;
  pdf.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, yPos);
  yPos += 10;

  // CLIENT INFORMATION
  yPos = addSectionTitle("INFORMAÇÕES DO CLIENTE", yPos);
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
  yPos += 5;

  // TECHNICIAN INFORMATION
  yPos = addSectionTitle("TÉCNICO RESPONSÁVEL", yPos);
  pdf.text(`Nome: ${call.technicians?.full_name || "N/A"}`, margin, yPos);
  yPos += 6;
  pdf.text(`Telefone: ${call.technicians?.phone || "N/A"}`, margin, yPos);
  yPos += 6;
  yPos += 5;

  // SCHEDULING
  yPos = addSectionTitle("AGENDAMENTO", yPos);
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
      pdf.text("* Áudio de diagnóstico disponível no sistema", margin, yPos);
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
    pdf.text(`${call.photos_before_urls.length} foto(s)`, margin, yPos);
    yPos += 10;
    
    // Layout: 2 fotos por linha, dimensão 80x60mm cada
    const photoWidth = 80;
    const photoHeight = 60;
    const photoSpacing = 10;
    let xPos = margin;
    let photosInRow = 0;
    
    for (const photoUrl of call.photos_before_urls) {
      // Verificar se precisa de nova página
      if (yPos + photoHeight > 270) {
        pdf.addPage();
        yPos = 20;
        xPos = margin;
        photosInRow = 0;
      }
      
      // Carregar e adicionar imagem
      const imageData = await loadImageAsBase64(photoUrl);
      if (imageData) {
        try {
          pdf.addImage(imageData, 'JPEG', xPos, yPos, photoWidth, photoHeight);
          
          // Adicionar borda ao redor da foto
          pdf.setLineWidth(0.2);
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(xPos, yPos, photoWidth, photoHeight);
        } catch (error) {
          console.error("Erro ao adicionar imagem ao PDF:", error);
          // Desenhar placeholder se falhar
          pdf.setFillColor(240, 240, 240);
          pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
          pdf.setFontSize(8);
          pdf.text("Imagem não disponível", xPos + photoWidth/2, yPos + photoHeight/2, { align: "center" });
        }
      } else {
        // Desenhar placeholder cinza se não carregar
        pdf.setFillColor(240, 240, 240);
        pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
        pdf.setFontSize(8);
        pdf.text("Imagem não disponível", xPos + photoWidth/2, yPos + photoHeight/2, { align: "center" });
      }
      
      photosInRow++;
      
      // 2 fotos por linha
      if (photosInRow === 2) {
        yPos += photoHeight + photoSpacing;
        xPos = margin;
        photosInRow = 0;
      } else {
        xPos += photoWidth + photoSpacing;
      }
    }
    
    // Ajustar posição se última linha ficou incompleta
    if (photosInRow > 0) {
      yPos += photoHeight + photoSpacing;
    }
    
    yPos += 5;
  }
  
  // Indicador de vídeo ANTES
  if (call.video_before_url) {
    if (yPos > 260) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.setFillColor(230, 230, 250);
    pdf.rect(margin, yPos, pageWidth - 2*margin, 20, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("▶ VÍDEO DISPONÍVEL", margin + 5, yPos + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Acesse o sistema para visualizar o vídeo completo", margin + 5, yPos + 15);
    
    yPos += 25;
  }

  // PHOTOS AFTER
  if (call.photos_after_urls && call.photos_after_urls.length > 0) {
    if (yPos > 240) {
      pdf.addPage();
      yPos = 20;
    }
    
    yPos = addSectionTitle("REGISTRO FOTOGRÁFICO - DEPOIS", yPos);
    pdf.setFontSize(9);
    pdf.text(`${call.photos_after_urls.length} foto(s)`, margin, yPos);
    yPos += 10;
    
    // Layout: 2 fotos por linha, dimensão 80x60mm cada
    const photoWidth = 80;
    const photoHeight = 60;
    const photoSpacing = 10;
    let xPos = margin;
    let photosInRow = 0;
    
    for (const photoUrl of call.photos_after_urls) {
      // Verificar se precisa de nova página
      if (yPos + photoHeight > 270) {
        pdf.addPage();
        yPos = 20;
        xPos = margin;
        photosInRow = 0;
      }
      
      // Carregar e adicionar imagem
      const imageData = await loadImageAsBase64(photoUrl);
      if (imageData) {
        try {
          pdf.addImage(imageData, 'JPEG', xPos, yPos, photoWidth, photoHeight);
          
          // Adicionar borda ao redor da foto
          pdf.setLineWidth(0.2);
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(xPos, yPos, photoWidth, photoHeight);
        } catch (error) {
          console.error("Erro ao adicionar imagem ao PDF:", error);
          // Desenhar placeholder se falhar
          pdf.setFillColor(240, 240, 240);
          pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
          pdf.setFontSize(8);
          pdf.text("Imagem não disponível", xPos + photoWidth/2, yPos + photoHeight/2, { align: "center" });
        }
      } else {
        // Desenhar placeholder cinza se não carregar
        pdf.setFillColor(240, 240, 240);
        pdf.rect(xPos, yPos, photoWidth, photoHeight, 'F');
        pdf.setFontSize(8);
        pdf.text("Imagem não disponível", xPos + photoWidth/2, yPos + photoHeight/2, { align: "center" });
      }
      
      photosInRow++;
      
      // 2 fotos por linha
      if (photosInRow === 2) {
        yPos += photoHeight + photoSpacing;
        xPos = margin;
        photosInRow = 0;
      } else {
        xPos += photoWidth + photoSpacing;
      }
    }
    
    // Ajustar posição se última linha ficou incompleta
    if (photosInRow > 0) {
      yPos += photoHeight + photoSpacing;
    }
    
    yPos += 5;
  }
  
  // Indicador de vídeo DEPOIS
  if (call.video_after_url) {
    if (yPos > 260) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.setFillColor(230, 230, 250);
    pdf.rect(margin, yPos, pageWidth - 2*margin, 20, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("▶ VÍDEO DISPONÍVEL", margin + 5, yPos + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Acesse o sistema para visualizar o vídeo completo", margin + 5, yPos + 15);
    
    yPos += 25;
  }

  // CHECKLIST
  if (call.checklist_responses && checklistItems.length > 0) {
    if (yPos > 220) {
      pdf.addPage();
      yPos = 20;
    }
    
    yPos = addSectionTitle("CHECKLIST DE VERIFICAÇÃO", yPos);
    
    pdf.setFontSize(9);
    
    const responses = call.checklist_responses as Record<string, boolean>;
    
    // Criar mapa de ID -> texto
    const itemTextMap = new Map(checklistItems.map(item => [item.id, item.text]));
    
    Object.entries(responses).forEach(([itemId, checked]) => {
      // Buscar texto da pergunta usando o ID
      const questionText = itemTextMap.get(itemId) || itemId;
      
      // Símbolo ASCII simples
      const symbol = checked ? "[X]" : "[ ]";
      
      // Texto da pergunta com word wrap
      const maxWidth = pageWidth - 2 * margin - 15;
      const lines = pdf.splitTextToSize(questionText, maxWidth);
      
      pdf.text(symbol, margin, yPos);
      pdf.text(lines, margin + 10, yPos);
      
      yPos += lines.length * 5 + 2;
      
      // Verificar se precisa de nova página
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
    });
    
    yPos += 5;
  }

  // SIGNATURES - New page
  pdf.addPage();
  yPos = 20;

  // Cabeçalho de assinaturas
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 1;
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("ASSINATURAS", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 1;
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

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
