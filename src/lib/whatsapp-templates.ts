/**
 * WhatsApp integration utilities
 * Generates wa.me links for direct WhatsApp messaging
 */

export interface WhatsAppMessageData {
  phoneNumber: string;
  clientName: string;
  osNumber: string;
  deviceModel?: string;
  issue?: string;
  status?: string;
}

export interface WhatsAppPdfMessageData extends WhatsAppMessageData {
  pdfUrl?: string;
  reportDate?: string;
  reportAccessToken?: string;
}

/**
 * Generates a WhatsApp link with pre-filled message
 * @param data - Message data including phone number and OS details
 * @returns WhatsApp deep link URL
 */
export const generateWhatsAppLink = (data: WhatsAppMessageData): string => {
  const { phoneNumber, clientName, osNumber, deviceModel, issue, status } = data;
  
  // Remove non-numeric characters from phone
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Build message based on available data
  let message = `Olá ${clientName}!\n\n`;
  message += `Referente à OS #${osNumber}`;
  
  if (deviceModel) {
    message += `\n📱 Equipamento: ${deviceModel}`;
  }
  
  if (issue) {
    message += `\n🔧 Problema: ${issue}`;
  }
  
  if (status) {
    message += `\n📊 Status: ${status}`;
  }
  
  message += `\n\nEstou entrando em contato para atualizar sobre o andamento do serviço.`;
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Return wa.me link
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Gera link do WhatsApp com PDF do relatório
 */
const PUBLIC_BASE_URL = "https://curitibainoxapp.com";

export const generateWhatsAppLinkWithPdf = (
  data: WhatsAppPdfMessageData
): string => {
  const { phoneNumber, clientName, osNumber, reportAccessToken } = data;
  
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Include access token in URL if available
  const publicReportUrl = reportAccessToken 
    ? `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}/${reportAccessToken}`
    : `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}`;
  
  let message = `Olá! Seu relatório da OS nº ${osNumber} está pronto.\n`;
  message += `Acesse pelo link: ${publicReportUrl}`;
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Normaliza telefone brasileiro ou internacional
 * Remove caracteres não numéricos e adiciona DDI 55 se necessário
 */
export function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  
  // Se já tem DDI 55 Brasil (12-13 dígitos)
  if (/^55\d{10,11}$/.test(digits)) return digits;
  
  // Se é BR sem DDI (10-11 dígitos), adiciona 55
  if (/^\d{10,11}$/.test(digits)) return '55' + digits;
  
  // Retorna como está (internacional ou inválido)
  return digits;
}

/**
 * Constrói URL do WhatsApp com detecção mobile/desktop
 * Mobile: usa wa.me
 * Desktop: usa web.whatsapp.com/send
 */
export function buildWhatsAppUrl(phoneRaw: string, message: string): string {
  const phone = normalizePhone(phoneRaw);
  const text = encodeURIComponent(message || '');
  
  // Sempre usa wa.me (funciona em mobile e desktop)
  const url = `https://wa.me/${phone}?text=${text}`;
  
  console.log('🔗 URL WhatsApp gerada:', url);
  console.log('📞 Telefone normalizado:', phone);
  
  return url;
}

/**
 * Abre WhatsApp em nova aba com tratamento de erro
 * Usa detecção automática mobile/desktop
 */
export function openWhatsApp(phoneRaw: string, message: string): void {
  const url = buildWhatsAppUrl(phoneRaw, message);
  
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  if (!newWindow) {
    alert('⚠️ Não foi possível abrir o WhatsApp.\n\nPermita pop-ups para este site nas configurações do navegador.');
  }
}

/**
 * Gera link do WhatsApp simples (sem mensagem pré-formatada)
 * Abre conversa para o usuário digitar manualmente
 */
export const generateSimpleWhatsAppLink = (phoneNumber: string): string => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}`;
};

/**
 * Status messages in Portuguese for OS updates
 */
export const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  waiting_parts: 'Aguardando Peças',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};
