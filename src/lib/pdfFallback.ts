/**
 * Sistema modular de fallback para abertura/download de PDFs
 */

export interface PdfFallbackResult {
  url: string;
  opened: boolean;
}

// ========== FUNÇÕES ATÔMICAS ==========

/**
 * Cria uma URL temporária para o Blob do PDF
 */
export function makeObjectUrl(pdfBlob: Blob): string {
  return URL.createObjectURL(pdfBlob);
}

/**
 * Tenta abrir URL em nova aba
 * @returns true se conseguiu abrir, false se foi bloqueado
 */
export function tryOpenInNewTab(url: string): boolean {
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    
    // Detecção robusta de bloqueio:
    // - Se retornar null, foi bloqueado imediatamente
    // - Se retornar janela mas closed=true, foi fechada pelo bloqueador
    if (win === null || win.closed) {
      console.warn("🚫 Abertura de nova aba bloqueada (extensão/segurança)");
      return false;
    }
    
    // Aguarda 100ms para verificar se a janela foi fechada automaticamente
    setTimeout(() => {
      if (win.closed) {
        console.warn("🚫 Janela foi fechada automaticamente pelo navegador");
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.warn("🚫 Erro ao tentar abrir nova aba:", error);
    return false;
  }
}

/**
 * Força o download do arquivo através de um link temporário
 */
export function forceDownload(url: string, fileName: string): void {
  console.log("📥 Forçando download automático do PDF...");
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    
    // Remove após um pequeno delay para garantir que o download iniciou
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  } catch (error) {
    console.error("❌ Erro ao forçar download:", error);
  }
}

// ========== FUNÇÃO PRINCIPAL (ORQUESTRADORA) ==========

/**
 * Tenta abrir PDF em nova aba ou forçar download
 * @param pdfBlob - Blob do PDF gerado
 * @param fileName - Nome do arquivo para download
 * @returns Objeto com URL e status de abertura
 */
export function openOrDownloadPdf(
  pdfBlob: Blob,
  fileName: string
): PdfFallbackResult {
  // 1. Criar URL do Blob
  const url = makeObjectUrl(pdfBlob);
  
  // 2. Tentar abrir em nova aba
  const opened = tryOpenInNewTab(url);
  
  // 3. Se falhou, forçar download
  if (!opened) {
    forceDownload(url, fileName);
  }
  
  // 4. Retornar URL para uso posterior (WhatsApp, botão manual)
  return { url, opened };
}

/**
 * Limpa a URL criada pelo createObjectURL após uso
 * @param url - URL do Blob a ser revogada
 * @param delayMs - Delay antes de revogar (padrão: 60s)
 */
export function revokePdfUrl(url: string, delayMs: number = 60000): void {
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Erro ao revogar URL do PDF:", error);
    }
  }, delayMs);
}
