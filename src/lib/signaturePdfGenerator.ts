import jsPDF from 'jspdf';
import { loadSystemLogoForPdf, addLogoToPdf } from "./pdfLogoHelper";

export const generateSignaturePDF = async (
  signatureData: string,
  type: 'technician' | 'customer',
  extraData?: { name?: string; position?: string }
): Promise<Blob> => {
  const logoBase64 = await loadSystemLogoForPdf();
  
  const pdf = new jsPDF();
  
  // Adicionar logo pequena no canto superior direito
  addLogoToPdf(pdf, logoBase64, {
    x: 20,
    y: 8,
    width: 25,
    height: 12,
    align: 'right',
  });
  
  // Título
  pdf.setFontSize(16);
  pdf.text(
    type === 'technician' ? 'Assinatura do Técnico' : 'Assinatura do Cliente',
    105,
    25,
    { align: 'center' }
  );
  
  // Data e hora
  pdf.setFontSize(10);
  const now = new Date().toLocaleString('pt-BR');
  pdf.text(`Data: ${now}`, 20, 40);
  
  // Campos extras para cliente
  if (type === 'customer' && extraData) {
    pdf.text(`Nome: ${extraData.name}`, 20, 50);
    pdf.text(`Cargo: ${extraData.position}`, 20, 60);
  }
  
  // Adicionar imagem da assinatura
  pdf.addImage(signatureData, 'PNG', 20, type === 'customer' ? 70 : 50, 170, 60);
  
  // Linha de assinatura
  pdf.line(20, type === 'customer' ? 135 : 115, 190, type === 'customer' ? 135 : 115);
  pdf.setFontSize(8);
  pdf.text('Assinatura', 105, type === 'customer' ? 140 : 120, { align: 'center' });
  
  return pdf.output('blob');
};
