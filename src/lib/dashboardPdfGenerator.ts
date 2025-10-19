import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardData {
  totalClients: number;
  totalCalls: number;
  totalEquipment: number;
  completionRate: number;
  startDate?: Date;
  endDate?: Date;
  technicianName?: string;
}

export const generateDashboardReport = async (
  data: DashboardData,
  chartElements: {
    statusChart: HTMLElement;
    technicianChart: HTMLElement;
    serviceTypeChart: HTMLElement;
    equipmentChart: HTMLElement;
  }
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 20;

  // Helper para adicionar rodapé
  const addFooter = (pageNum: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      margin,
      pageHeight - 10
    );
    pdf.text(`Página ${pageNum}`, pageWidth - margin - 20, pageHeight - 10);
  };

  // ========== PÁGINA 1: CABEÇALHO + MÉTRICAS ==========
  
  // Cabeçalho
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELATÓRIO ANALÍTICO - DASHBOARD", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Curitiba Inox", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Linha separadora
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Filtros Aplicados
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("FILTROS APLICADOS:", margin, yPos);
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  if (data.startDate || data.endDate) {
    const startText = data.startDate 
      ? format(data.startDate, "dd/MM/yyyy", { locale: ptBR }) 
      : "Sem início";
    const endText = data.endDate 
      ? format(data.endDate, "dd/MM/yyyy", { locale: ptBR }) 
      : "Sem fim";
    pdf.text(`Período: ${startText} até ${endText}`, margin + 5, yPos);
    yPos += 6;
  } else {
    pdf.text("Período: Todos os registros", margin + 5, yPos);
    yPos += 6;
  }

  if (data.technicianName) {
    pdf.text(`Técnico: ${data.technicianName}`, margin + 5, yPos);
    yPos += 6;
  } else {
    pdf.text("Técnico: Todos", margin + 5, yPos);
    yPos += 6;
  }
  
  yPos += 10;

  // Seção de Métricas
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("INDICADORES PRINCIPAIS:", margin, yPos);
  yPos += 10;

  // Layout em 2 colunas para as métricas
  const colWidth = (pageWidth - 3 * margin) / 2;
  
  // Coluna 1
  let col1Y = yPos;
  pdf.setFillColor(59, 130, 246); // Azul
  pdf.roundedRect(margin, col1Y, colWidth, 20, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text("Clientes Atendidos", margin + 5, col1Y + 7);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(data.totalClients), margin + 5, col1Y + 16);
  pdf.setFont("helvetica", "normal");

  col1Y += 25;
  pdf.setFillColor(249, 115, 22); // Laranja
  pdf.roundedRect(margin, col1Y, colWidth, 20, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.text("Equipamentos", margin + 5, col1Y + 7);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(data.totalEquipment), margin + 5, col1Y + 16);
  pdf.setFont("helvetica", "normal");

  // Coluna 2
  let col2Y = yPos;
  const col2X = margin + colWidth + margin;
  
  pdf.setFillColor(34, 197, 94); // Verde
  pdf.roundedRect(col2X, col2Y, colWidth, 20, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.text("Total de Chamados", col2X + 5, col2Y + 7);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(String(data.totalCalls), col2X + 5, col2Y + 16);
  pdf.setFont("helvetica", "normal");

  col2Y += 25;
  pdf.setFillColor(168, 85, 247); // Roxo
  pdf.roundedRect(col2X, col2Y, colWidth, 20, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.text("Taxa de Conclusão", col2X + 5, col2Y + 7);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${data.completionRate.toFixed(1)}%`, col2X + 5, col2Y + 16);
  
  // Reset cores
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");

  addFooter(1);

  // ========== PÁGINAS 2-5: GRÁFICOS ==========
  
  const charts = [
    { element: chartElements.statusChart, title: "CHAMADOS POR STATUS" },
    { element: chartElements.technicianChart, title: "CHAMADOS POR TÉCNICO" },
    { element: chartElements.serviceTypeChart, title: "CHAMADOS POR TIPO DE SERVIÇO" },
    { element: chartElements.equipmentChart, title: "TOP 5 EQUIPAMENTOS" },
  ];

  for (let i = 0; i < charts.length; i++) {
    pdf.addPage();
    yPos = 20;

    // Título do gráfico
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(charts[i].title, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Capturar gráfico como imagem
    try {
      const canvas = await html2canvas(charts[i].element, {
        backgroundColor: "#ffffff",
        scale: 2, // Melhor qualidade
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      
      // Calcular dimensões mantendo proporção
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Centralizar verticalmente
      const yOffset = (pageHeight - imgHeight - yPos - 20) / 2;
      
      pdf.addImage(imgData, "PNG", margin, yPos + yOffset, imgWidth, imgHeight);
    } catch (error) {
      console.error(`Erro ao capturar gráfico ${i + 1}:`, error);
      pdf.setFontSize(10);
      pdf.text("Erro ao gerar gráfico", pageWidth / 2, pageHeight / 2, { align: "center" });
    }

    addFooter(i + 2);
  }

  return pdf;
};