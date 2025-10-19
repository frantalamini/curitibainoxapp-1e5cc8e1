import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { loadSystemLogoForPdf, addLogoToPdf } from "./pdfLogoHelper";

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
  const logoBase64 = await loadSystemLogoForPdf();
  
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 15;

  // Logo no canto superior esquerdo
  addLogoToPdf(pdf, logoBase64, {
    x: margin,
    y: 10,
    width: 35,
    height: 18,
  });

  // ========== CABEÇALHO COMPACTO ==========
  yPos = 32;
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("RELATÓRIO ANALÍTICO - DASHBOARD", pageWidth / 2, yPos, { align: "center" });
  yPos += 7;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Curitiba Inox", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  // Linha separadora
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Filtros em linha única
  pdf.setFontSize(8);
  let filterText = "Filtros: ";
  
  if (data.startDate || data.endDate) {
    const startText = data.startDate 
      ? format(data.startDate, "dd/MM/yyyy", { locale: ptBR }) 
      : "Sem início";
    const endText = data.endDate 
      ? format(data.endDate, "dd/MM/yyyy", { locale: ptBR }) 
      : "Sem fim";
    filterText += `${startText} até ${endText}`;
  } else {
    filterText += "Todos os registros";
  }

  if (data.technicianName) {
    filterText += ` | Técnico: ${data.technicianName}`;
  } else {
    filterText += " | Técnico: Todos";
  }

  pdf.text(filterText, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // ========== MÉTRICAS EM LINHA ==========
  const metricWidth = (pageWidth - 2 * margin - 9) / 4;
  const metricHeight = 15;
  const metrics = [
    { label: "Clientes", value: String(data.totalClients), color: [59, 130, 246] },
    { label: "Chamados", value: String(data.totalCalls), color: [34, 197, 94] },
    { label: "Equipamentos", value: String(data.totalEquipment), color: [249, 115, 22] },
    { label: "Conclusão", value: `${data.completionRate.toFixed(0)}%`, color: [168, 85, 247] },
  ];

  metrics.forEach((metric, index) => {
    const xPos = margin + index * (metricWidth + 3);
    pdf.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    pdf.roundedRect(xPos, yPos, metricWidth, metricHeight, 2, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text(metric.label, xPos + metricWidth / 2, yPos + 5, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(metric.value, xPos + metricWidth / 2, yPos + 12, { align: "center" });
    pdf.setFont("helvetica", "normal");
  });

  pdf.setTextColor(0, 0, 0);
  yPos += metricHeight + 8;

  // ========== GRÁFICOS EM GRID 2x2 ==========
  const chartWidth = (pageWidth - 2 * margin - 5) / 2;
  const chartHeight = 55;
  const chartSpacing = 5;

  const charts = [
    { element: chartElements.statusChart, title: "Status", x: 0, y: 0 },
    { element: chartElements.technicianChart, title: "Técnicos", x: 1, y: 0 },
    { element: chartElements.serviceTypeChart, title: "Tipos de Serviço", x: 0, y: 1 },
    { element: chartElements.equipmentChart, title: "Top 5 Equipamentos", x: 1, y: 1 },
  ];

  // Capturar todos os gráficos em paralelo
  try {
    const chartImages = await Promise.all(
      charts.map(async (chart) => {
        const canvas = await html2canvas(chart.element, {
          backgroundColor: "#ffffff",
          scale: 1.5,
          logging: false,
        });
        return {
          ...chart,
          imgData: canvas.toDataURL("image/png"),
          canvas,
        };
      })
    );

    // Renderizar gráficos no grid
    chartImages.forEach((chart) => {
      const xPos = margin + chart.x * (chartWidth + chartSpacing);
      const yPosChart = yPos + chart.y * (chartHeight + 8);

      // Título do gráfico
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text(chart.title, xPos + chartWidth / 2, yPosChart, { align: "center" });

      // Imagem do gráfico
      const imgWidth = chartWidth;
      const imgHeight = (chart.canvas.height * imgWidth) / chart.canvas.width;
      const finalHeight = Math.min(imgHeight, chartHeight - 5);

      pdf.addImage(
        chart.imgData,
        "PNG",
        xPos,
        yPosChart + 3,
        imgWidth,
        finalHeight
      );
    });
  } catch (error) {
    console.error("Erro ao capturar gráficos:", error);
    pdf.setFontSize(10);
    pdf.text("Erro ao gerar gráficos", pageWidth / 2, yPos + 30, { align: "center" });
  }

  // ========== RODAPÉ ==========
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin,
    pageHeight - 8
  );

  return pdf;
};
