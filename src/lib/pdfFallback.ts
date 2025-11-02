/**
 * Sistema de fallback para abertura/download de PDFs
 * Tenta abrir em nova aba, se falhar força download, e fornece URL manual
 */

export interface PdfFallbackResult {
  url: string;
  opened: boolean;
}

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
  const url = URL.createObjectURL(pdfBlob);
  let opened = false;

  try {
    // Tenta abrir em nova aba (pode ser bloqueado por extensões ou políticas de segurança)
    const win = window.open(url, "_blank", "noopener,noreferrer");
    
    // Detecção robusta de bloqueio:
    // - Se retornar null, foi bloqueado imediatamente
    // - Se retornar janela mas closed=true, foi fechada pelo bloqueador
    if (win === null || win.closed) {
      console.warn("🚫 Abertura de nova aba bloqueada (extensão/segurança)");
      opened = false;
    } else {
      // Aguarda 100ms para verificar se a janela foi fechada automaticamente
      setTimeout(() => {
        if (win.closed) {
          console.warn("🚫 Janela foi fechada automaticamente pelo navegador");
        }
      }, 100);
      opened = true;
    }
  } catch (error) {
    console.warn("🚫 Erro ao tentar abrir nova aba:", error);
    opened = false;
  }

  // Se não abriu, força download silencioso
  if (!opened) {
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

  // Retorna URL para uso posterior (WhatsApp, botão manual)
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
