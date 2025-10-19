import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceCall } from "@/hooks/useServiceCalls";

export const generateServiceCallReport = async (call: ServiceCall): Promise<jsPDF> => {
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

  // HEADER
  pdf.setFillColor(59, 130, 246); // primary color
  pdf.rect(0, 0, pageWidth, 30, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELATÓRIO DE CHAMADO TÉCNICO", pageWidth / 2, 15, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  yPos = 40;

  // Status Badge
  const statusMap: Record<string, string> = {
    pending: "Aguardando Início",
    in_progress: "Em Andamento",
    on_hold: "Com Pendências",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Status: ${statusMap[call.status] || call.status}`, margin, yPos);
  pdf.setFont("helvetica", "normal");
  yPos += 7;

  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, margin, yPos);
  pdf.setTextColor(0, 0, 0);
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
  yPos += 10;

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

  // CHECKLIST
  if (call.checklist_responses) {
    if (yPos > 220) {
      pdf.addPage();
      yPos = 20;
    }
    yPos = addSectionTitle("CHECKLIST DE VERIFICAÇÃO", yPos);
    pdf.setFontSize(9);
    
    const responses = call.checklist_responses as Record<string, boolean>;
    Object.entries(responses).forEach(([item, checked]) => {
      const symbol = checked ? "☑" : "☐";
      pdf.text(`${symbol} ${item}`, margin + 5, yPos);
      yPos += 5;
    });
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
