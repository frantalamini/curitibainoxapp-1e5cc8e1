import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { openWhatsApp, WhatsAppMessageData } from "@/lib/whatsapp-templates";

interface WhatsAppButtonProps {
  data: WhatsAppMessageData;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

/**
 * Constrói mensagem a partir dos dados da OS
 */
function buildMessageFromData(data: WhatsAppMessageData): string {
  let message = `Olá ${data.clientName}!\n\n`;
  message += `Referente à OS #${data.osNumber}`;
  
  if (data.deviceModel) {
    message += `\n📱 Equipamento: ${data.deviceModel}`;
  }
  
  if (data.issue) {
    message += `\n🔧 Problema: ${data.issue}`;
  }
  
  if (data.status) {
    message += `\n📊 Status: ${data.status}`;
  }
  
  message += `\n\nEstou entrando em contato para atualizar sobre o andamento do serviço.`;
  
  return message;
}

/**
 * WhatsApp Button Component
 * Opens WhatsApp with pre-filled message for client communication
 */
export const WhatsAppButton = ({ 
  data, 
  variant = "default", 
  size = "default",
  className 
}: WhatsAppButtonProps) => {
  const handleClick = () => {
    const message = buildMessageFromData(data);
    openWhatsApp(data.phoneNumber, message);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      WhatsApp
    </Button>
  );
};
