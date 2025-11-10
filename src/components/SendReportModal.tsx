import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type WhatsAppContact = {
  id: string;
  label: string;
  name: string;
  phoneRaw: string;
  phoneE164: string;
  isLikelyWhatsApp: boolean;
  role: 'financial' | 'technical' | 'legal' | 'primary' | 'secondary';
};

type EmailContact = {
  id: string;
  label: string;
  name: string;
  email: string;
  role: 'financial' | 'technical' | 'legal';
};

interface SendReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'whatsapp' | 'email';
  osNumber: string;
  pdfUrl: string;
  clientData: any;
  companyName?: string;
}

/**
 * Normaliza telefone brasileiro para formato E.164 (+55AANNNNNNNN)
 */
function normalizePhoneBR(raw?: string): string | null {
  if (!raw) return null;
  
  let digits = raw.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  
  if (digits.startsWith('55')) {
    if (digits.length === 13 || digits.length === 12) {
      return `+${digits}`;
    }
    return null;
  }
  
  if (digits.length === 11 || digits.length === 10) {
    return `+55${digits}`;
  }
  
  return null;
}

/**
 * Verifica se o número é provável celular brasileiro (tem WhatsApp)
 */
function isLikelyWhatsApp(e164: string): boolean {
  const match = e164.match(/^\+55(\d{2})(\d{8,9})$/);
  if (!match) return false;
  
  const localNumber = match[2];
  return localNumber.length === 9 && localNumber.startsWith('9');
}

/**
 * Valida email básico
 */
const isValidEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Coleta TODOS os telefones do cadastro do cliente e normaliza
 */
function collectAllPhones(clientData: any): WhatsAppContact[] {
  const contacts: WhatsAppContact[] = [];
  
  // 1. CONTATO PRINCIPAL
  if (clientData.phone) {
    const e164 = normalizePhoneBR(clientData.phone);
    if (e164) {
      contacts.push({
        id: 'primary',
        label: 'Contato Principal',
        name: clientData.full_name || 'Cliente',
        phoneRaw: clientData.phone,
        phoneE164: e164,
        isLikelyWhatsApp: isLikelyWhatsApp(e164),
        role: 'primary',
      });
    }
  }
  
  // 2. CONTATO SECUNDÁRIO
  if (clientData.phone_2) {
    const e164 = normalizePhoneBR(clientData.phone_2);
    if (e164) {
      contacts.push({
        id: 'secondary',
        label: 'Contato Secundário',
        name: clientData.full_name || 'Cliente',
        phoneRaw: clientData.phone_2,
        phoneE164: e164,
        isLikelyWhatsApp: isLikelyWhatsApp(e164),
        role: 'secondary',
      });
    }
  }
  
  // 3. RESPONSÁVEL FINANCEIRO
  if (clientData.responsible_financial?.phone) {
    const e164 = normalizePhoneBR(clientData.responsible_financial.phone);
    if (e164) {
      contacts.push({
        id: 'financial',
        label: 'Financeiro',
        name: clientData.responsible_financial.name || 'Responsável Financeiro',
        phoneRaw: clientData.responsible_financial.phone,
        phoneE164: e164,
        isLikelyWhatsApp: isLikelyWhatsApp(e164),
        role: 'financial',
      });
    }
  }
  
  // 4. ACOMPANHAMENTO TÉCNICO
  if (clientData.responsible_technical?.phone) {
    const e164 = normalizePhoneBR(clientData.responsible_technical.phone);
    if (e164) {
      contacts.push({
        id: 'technical',
        label: 'Acompanhamento Técnico',
        name: clientData.responsible_technical.name || 'Responsável Técnico',
        phoneRaw: clientData.responsible_technical.phone,
        phoneE164: e164,
        isLikelyWhatsApp: isLikelyWhatsApp(e164),
        role: 'technical',
      });
    }
  }
  
  // 5. RESPONSÁVEL LEGAL
  if (clientData.responsible_legal?.phone) {
    const e164 = normalizePhoneBR(clientData.responsible_legal.phone);
    if (e164) {
      contacts.push({
        id: 'legal',
        label: 'Responsável Legal',
        name: clientData.responsible_legal.name || 'Responsável Legal',
        phoneRaw: clientData.responsible_legal.phone,
        phoneE164: e164,
        isLikelyWhatsApp: isLikelyWhatsApp(e164),
        role: 'legal',
      });
    }
  }
  
  // Remover duplicatas
  const uniqueContacts = contacts.filter((contact, index, self) =>
    index === self.findIndex(c => c.phoneE164 === contact.phoneE164)
  );
  
  return uniqueContacts;
}

/**
 * Extrai contatos de e-mail
 */
function extractEmailContacts(clientData: any): EmailContact[] {
  const contacts: EmailContact[] = [];
  
  if (clientData.responsible_financial?.email && isValidEmail(clientData.responsible_financial.email)) {
    contacts.push({
      id: 'financial',
      label: 'Financeiro',
      name: clientData.responsible_financial.name || 'Responsável Financeiro',
      email: clientData.responsible_financial.email,
      role: 'financial',
    });
  }
  
  if (clientData.responsible_technical?.email && isValidEmail(clientData.responsible_technical.email)) {
    contacts.push({
      id: 'technical',
      label: 'Acompanhamento Técnico',
      name: clientData.responsible_technical.name || 'Responsável Técnico',
      email: clientData.responsible_technical.email,
      role: 'technical',
    });
  }
  
  if (clientData.responsible_legal?.email && isValidEmail(clientData.responsible_legal.email)) {
    contacts.push({
      id: 'legal',
      label: 'Responsável Legal',
      name: clientData.responsible_legal.name || 'Responsável Legal',
      email: clientData.responsible_legal.email,
      role: 'legal',
    });
  }
  
  return contacts;
}

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
  
  const availableContacts = mode === 'whatsapp' 
    ? collectAllPhones(clientData)
    : extractEmailContacts(clientData);
  
  // PRÉ-MARCAR celulares automaticamente ao abrir
  useEffect(() => {
    if (open && mode === 'whatsapp') {
      const likelyWhatsAppIds = (availableContacts as WhatsAppContact[])
        .filter(c => c.isLikelyWhatsApp)
        .map(c => c.id);
      
      setSelectedContacts(likelyWhatsAppIds);
    } else if (open) {
      setSelectedContacts([]);
    }
  }, [open, mode, availableContacts]);
  
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
      selectedContacts.includes(c.id)
    );
    
    if (mode === 'whatsapp') {
      const message = `Olá! Segue o relatório da OS nº ${osNumber}.\n\nBaixe o PDF aqui:\n${pdfUrl}\n\nQualquer dúvida, estamos à disposição.`;
      
      (selected as WhatsAppContact[]).forEach(contact => {
        const waNumber = contact.phoneE164.replace('+', '');
        const encodedMessage = encodeURIComponent(message);
        const link = `https://wa.me/${waNumber}?text=${encodedMessage}`;
        
        window.open(link, '_blank', 'noopener,noreferrer');
      });
      
      const fixos = (selected as WhatsAppContact[]).filter(c => !c.isLikelyWhatsApp);
      const celulares = (selected as WhatsAppContact[]).filter(c => c.isLikelyWhatsApp);
      
      toast({
        title: "Links abertos para envio",
        description: fixos.length > 0
          ? `${celulares.length} celular(es) • ${fixos.length} fixo(s) (pode não ter WhatsApp)`
          : `${selected.length} conversa(s) do WhatsApp aberta(s).`,
      });
    } else {
      const emails = (selected as EmailContact[]).map(c => c.email).join(',');
      const subject = encodeURIComponent(`Relatório OS #${osNumber} – ${companyName}`);
      const body = encodeURIComponent(
        `Olá,\n\nSegue o relatório da OS #${osNumber}.\n\nBaixe o PDF aqui:\n${pdfUrl}\n\nAtenciosamente,\n${companyName}`
      );
      const mailtoLink = `mailto:${emails}?subject=${subject}&body=${body}`;
      
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
              {mode === 'whatsapp' ? (
                (availableContacts as WhatsAppContact[]).map(contact => (
                  <div
                    key={contact.id}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                      contact.isLikelyWhatsApp 
                        ? "hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200 dark:border-green-900" 
                        : "hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                    )}
                  >
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleToggleContact(contact.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={contact.id}
                          className="font-medium cursor-pointer"
                        >
                          {contact.label}
                        </Label>
                        {contact.isLikelyWhatsApp ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                            Celular
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                            Fixo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {contact.name}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {contact.phoneE164}
                      </p>
                      {!contact.isLikelyWhatsApp && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Pode não ter WhatsApp
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                (availableContacts as EmailContact[]).map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleToggleContact(contact.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={contact.id}
                        className="font-medium cursor-pointer"
                      >
                        {contact.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {contact.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contact.email}
                      </p>
                    </div>
                  </div>
                ))
              )}
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
