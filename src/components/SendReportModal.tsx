import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type ResponsibleContact = {
  name: string;
  phone?: string;
  email?: string;
  role: 'financial' | 'technical' | 'legal';
  roleLabel: string;
};

interface SendReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'whatsapp' | 'email';
  osNumber: string;
  pdfUrl: string;
  clientData: {
    full_name: string;
    responsible_financial?: any;
    responsible_technical?: any;
    responsible_legal?: any;
  };
  companyName?: string;
}

/**
 * Valida telefone brasileiro (10-11 dígitos)
 */
const isValidPhone = (phone: string | undefined): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};

/**
 * Valida email básico
 */
const isValidEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Extrai contatos válidos do cliente
 */
const extractContacts = (
  clientData: SendReportModalProps['clientData'],
  mode: 'whatsapp' | 'email'
): ResponsibleContact[] => {
  const contacts: ResponsibleContact[] = [];
  
  // Financeiro
  if (clientData.responsible_financial?.name) {
    const phone = clientData.responsible_financial.phone;
    const email = clientData.responsible_financial.email;
    const isValid = mode === 'whatsapp' ? isValidPhone(phone) : isValidEmail(email);
    
    if (isValid) {
      contacts.push({
        name: clientData.responsible_financial.name,
        phone: phone,
        email: email,
        role: 'financial',
        roleLabel: 'Financeiro',
      });
    }
  }
  
  // Técnico
  if (clientData.responsible_technical?.name) {
    const phone = clientData.responsible_technical.phone;
    const email = clientData.responsible_technical.email;
    const isValid = mode === 'whatsapp' ? isValidPhone(phone) : isValidEmail(email);
    
    if (isValid) {
      contacts.push({
        name: clientData.responsible_technical.name,
        phone: phone,
        email: email,
        role: 'technical',
        roleLabel: 'Acompanhamento Técnico',
      });
    }
  }
  
  // Legal
  if (clientData.responsible_legal?.name) {
    const phone = clientData.responsible_legal.phone;
    const email = clientData.responsible_legal.email;
    const isValid = mode === 'whatsapp' ? isValidPhone(phone) : isValidEmail(email);
    
    if (isValid) {
      contacts.push({
        name: clientData.responsible_legal.name,
        phone: phone,
        email: email,
        role: 'legal',
        roleLabel: 'Responsável Legal',
      });
    }
  }
  
  return contacts;
};

export const SendReportModal = ({
  open,
  onOpenChange,
  mode,
  osNumber,
  pdfUrl,
  clientData,
  companyName = 'Curitiba Inox',
}: SendReportModalProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { toast } = useToast();
  
  const availableContacts = extractContacts(clientData, mode);
  
  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedContacts([]);
    }
  }, [open]);
  
  const handleToggleContact = (role: string) => {
    setSelectedContacts(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };
  
  const handleSend = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Nenhum destinatário selecionado",
        description: "Selecione ao menos um contato para enviar.",
        variant: "destructive",
      });
      return;
    }
    
    const selected = availableContacts.filter(c =>
      selectedContacts.includes(c.role)
    );
    
    if (mode === 'whatsapp') {
      // Gerar links WhatsApp
      selected.forEach(contact => {
        const cleanPhone = contact.phone!.replace(/\D/g, '');
        const message = `Olá! Segue o relatório da OS #${osNumber}.\n\nBaixe o PDF aqui:\n${pdfUrl}\n\nQualquer dúvida, estamos à disposição.`;
        const encodedMessage = encodeURIComponent(message);
        const link = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        // Abrir em nova aba
        window.open(link, '_blank');
      });
      
      toast({
        title: "Links abertos para envio",
        description: `${selected.length} conversa(s) do WhatsApp aberta(s).`,
      });
    } else {
      // Gerar links mailto
      const emails = selected.map(c => c.email).join(',');
      const subject = encodeURIComponent(`Relatório OS #${osNumber} – ${companyName}`);
      const body = encodeURIComponent(
        `Olá,\n\nSegue o relatório da OS #${osNumber}.\n\nBaixe o PDF aqui:\n${pdfUrl}\n\nAtenciosamente,\n${companyName}`
      );
      const mailtoLink = `mailto:${emails}?subject=${subject}&body=${body}`;
      
      // Abrir cliente de e-mail
      window.location.href = mailtoLink;
      
      toast({
        title: "Cliente de e-mail aberto",
        description: `E-mail preparado para ${selected.length} destinatário(s).`,
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'whatsapp' ? '📱 ' : '✉️ '}
            Selecione os destinatários
          </DialogTitle>
          <DialogDescription>
            {mode === 'whatsapp'
              ? 'Escolha os contatos para enviar o relatório via WhatsApp'
              : 'Escolha os contatos para enviar o relatório por e-mail'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {availableContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {mode === 'whatsapp'
                ? 'Nenhum telefone válido cadastrado.'
                : 'Nenhum e-mail válido cadastrado.'}
            </p>
          ) : (
            <div className="space-y-3">
              {availableContacts.map(contact => (
                <div
                  key={contact.role}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={contact.role}
                    checked={selectedContacts.includes(contact.role)}
                    onCheckedChange={() => handleToggleContact(contact.role)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={contact.role}
                      className="font-medium cursor-pointer"
                    >
                      {contact.roleLabel}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {contact.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mode === 'whatsapp' ? contact.phone : contact.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedContacts.length === 0}
            className={
              mode === 'whatsapp'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            {mode === 'whatsapp' ? (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Abrir WhatsApp
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Abrir E-mail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
