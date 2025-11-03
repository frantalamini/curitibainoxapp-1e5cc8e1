import jsPDF from "jspdf";

/**
 * Normaliza diferentes formatos de PDF para Blob tipado
 * Suporta: Blob, ArrayBuffer, string base64 (com ou sem dataURL), jsPDF instance
 */
export async function toPdfBlob(input: Blob | ArrayBuffer | string | jsPDF): Promise<Blob> {
  // jsPDF instance
  if (input && typeof input === 'object' && 'output' in input) {
    const arrayBuffer = input.output('arraybuffer');
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  }
  
  // Já é Blob
  if (input instanceof Blob) {
    if (input.type === 'application/pdf') return input;
    const buf = await input.arrayBuffer();
    return new Blob([buf], { type: 'application/pdf' });
  }
  
  // ArrayBuffer
  if (input instanceof ArrayBuffer) {
    return new Blob([input], { type: 'application/pdf' });
  }
  
  // string base64 (com ou sem dataURL)
  if (typeof input === 'string') {
    let b64 = input;
    if (b64.startsWith('data:')) {
      const comma = b64.indexOf(',');
      b64 = b64.slice(comma + 1);
    }
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Blob([bytes], { type: 'application/pdf' });
  }
  
  throw new Error('Formato de PDF inesperado: ' + typeof input);
}

/**
 * Gera nome padronizado para arquivo PDF de OS
 */
export function generatePdfFileName(osNumber: string | number): string {
  return `relatorio-os-${osNumber}.pdf`;
}
