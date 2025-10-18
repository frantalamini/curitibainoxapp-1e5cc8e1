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
 * Status messages in Portuguese for OS updates
 */
export const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  waiting_parts: 'Aguardando Peças',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};
