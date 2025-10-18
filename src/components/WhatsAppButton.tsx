import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { generateWhatsAppLink, WhatsAppMessageData } from "@/lib/whatsapp-templates";

interface WhatsAppButtonProps {
  data: WhatsAppMessageData;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
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
    const link = generateWhatsAppLink(data);
    window.open(link, '_blank');
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
