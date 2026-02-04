import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageCircle, Mail, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp-templates";
import InputMask from "react-input-mask";

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
  reportAccessToken?: string;
}

/**
 * Normaliza telefone brasileiro para formato E.164 (+55AANNNNNNNN)
 */
function normalizePhoneBR(raw?: string): string | null {
  if (!raw) return null;
  
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  
  // Remove zeros à esquerda
  const d = digits.replace(/^0+/, '');
  
  // Com DDI Brasil explícito (55 + AA + número)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    return `+${d}`;
  }
  
  // Sem DDI: assume Brasil (10 ou 11 dígitos)
  if (d.length === 10 || d.length === 11) {
    return `+55${d}`;
  }
  
  // DDI de outro país (12-15 dígitos, não começa com 55)
  if (d.length >= 12 && d.length <= 15) {
    return `+${d}`;
  }
  
  return null;
}

/**
 * Verifica se o número é provável celular brasileiro (tem WhatsApp)
 */
function isLikelyWhatsApp(e164: string): boolean {
  // Números brasileiros: validar se é celular
  const brMatch = e164.match(/^\+55(\d{2})(\d{8,9})$/);
  if (brMatch) {
    const localNumber = brMatch[2];
    return localNumber.length === 9 && localNumber.startsWith('9');
  }
  
  // Números internacionais: considerar como "provável WhatsApp"
  if (e164.match(/^\+\d{10,14}$/)) {
    return true;
  }
  
  return false;
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

/**
 * Constrói a mensagem do WhatsApp baseado na disponibilidade do PDF
 */
const PUBLIC_BASE_URL = "https://curitibainoxapp.lovable.app";

function buildMessage(osNumber: string, pdfUrl: string, reportAccessToken?: string): string {
  // Include access token in URL if available
  const publicReportUrl = reportAccessToken
    ? `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}/${reportAccessToken}`
    : `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}`;
  
  return `Olá! Seu relatório da OS nº ${osNumber} está pronto.\nAcesse pelo link: ${publicReportUrl}`;
}

function buildEmailBody(osNumber: string, companyName: string, reportAccessToken?: string): string {
  const publicReportUrl = reportAccessToken
    ? `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}/${reportAccessToken}`
    : `${PUBLIC_BASE_URL}/relatorio-os/${osNumber}`;
  
  return `Olá,\n\nSeu relatório da OS #${osNumber} está pronto.\n\nAcesse pelo link:\n${publicReportUrl}\n\nAtenciosamente,\n${companyName}`;
}

export const SendReportModal = ({
  open,
  onOpenChange,
  mode,
  osNumber,
  pdfUrl,
  clientData,
  companyName = 'Curitiba Inox',
  reportAccessToken,
}: SendReportModalProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [manualPhoneError, setManualPhoneError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
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
      setShowManualInput(false);
      setManualPhone('');
      setManualPhoneError('');
    } else if (open) {
      setSelectedContacts([]);
      setShowManualInput(false);
      setManualPhone('');
      setManualPhoneError('');
    }
  }, [open, mode, availableContacts]);
  
  const handleToggleContact = (role: string) => {
    setSelectedContacts(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };
  
  const handleManualSend = () => {
    const normalized = normalizePhoneBR(manualPhone);
    
    if (!normalized) {
      setManualPhoneError('Telefone inválido. Use formato: (XX) XXXXX-XXXX ou +55 XX XXXXX-XXXX');
      return;
    }
    
    const message = buildMessage(osNumber, pdfUrl, reportAccessToken);
    
    // 🆕 Usar a nova função com detecção mobile/desktop
    openWhatsApp(normalized.replace('+', ''), message);
    
    toast({
      title: "WhatsApp aberto",
      description: `Enviando para ${normalized}`,
    });
    
    setManualPhone('');
    setManualPhoneError('');
    onOpenChange(false);
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
      const message = buildMessage(osNumber, pdfUrl, reportAccessToken);
      
      // 🆕 Usar a nova função com detecção mobile/desktop
      (selected as WhatsAppContact[]).forEach(contact => {
        openWhatsApp(contact.phoneE164.replace('+', ''), message);
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
      const body = encodeURIComponent(buildEmailBody(osNumber, companyName, reportAccessToken));
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
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {availableContacts.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {mode === 'whatsapp' 
                  ? 'Nenhum telefone válido cadastrado.' 
                  : 'Nenhum email válido cadastrado para este cliente.'}
              </p>
              
              {mode === 'whatsapp' && (
                <div className="space-y-2">
                  <Label htmlFor="manual-phone">Informar número manualmente:</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={manualPhone}
                    onChange={(e) => {
                      setManualPhone(e.target.value);
                      setManualPhoneError('');
                    }}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="manual-phone"
                        type="text"
                        placeholder="(XX) XXXXX-XXXX"
                        className={manualPhoneError ? 'border-destructive' : ''}
                      />
                    )}
                  </InputMask>
                  {manualPhoneError && (
                    <p className="text-xs text-destructive">{manualPhoneError}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {mode === 'whatsapp' ? (
                <>
                  {(availableContacts as WhatsAppContact[]).map(contact => (
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
                  ))}
                  
                  {/* Opção para digitar outro número */}
                  <div className="pt-2 border-t">
                    {!showManualInput ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManualInput(true)}
                        className="w-full text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Enviar para outro número
                      </Button>
                    ) : (
                      <div className="space-y-2 p-3 rounded-lg border border-dashed bg-muted/30">
                        <Label htmlFor="manual-phone-extra" className="text-sm font-medium">
                          Outro número:
                        </Label>
                        <div className="flex gap-2">
                          <InputMask
                            mask="(99) 99999-9999"
                            value={manualPhone}
                            onChange={(e) => {
                              setManualPhone(e.target.value);
                              setManualPhoneError('');
                            }}
                          >
                            {(inputProps: any) => (
                              <Input
                                {...inputProps}
                                id="manual-phone-extra"
                                type="text"
                                placeholder="(XX) XXXXX-XXXX"
                                className={cn("flex-1", manualPhoneError ? 'border-destructive' : '')}
                              />
                            )}
                          </InputMask>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleManualSend}
                            disabled={!manualPhone.replace(/\D/g, '').length}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        {manualPhoneError && (
                          <p className="text-xs text-destructive">{manualPhoneError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Digite o DDD + número do celular
                        </p>
                      </div>
                    )}
                  </div>
                </>
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
          {availableContacts.length === 0 && mode === 'whatsapp' ? (
            <Button
              onClick={handleManualSend}
              disabled={!manualPhone.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar para este número
            </Button>
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
