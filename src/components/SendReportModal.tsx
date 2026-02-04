import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageCircle, Mail, AlertCircle, Plus, X } from "lucide-react";
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
const PUBLIC_BASE_URL = "https://curitibainoxapp.com";

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

/**
 * Verifica se o número manual está completo (11 dígitos)
 */
function isManualPhoneComplete(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
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
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualPhoneError, setManualPhoneError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const { toast } = useToast();
  
  // Memoizar contatos para evitar recálculos desnecessários
  const availableContacts = mode === 'whatsapp' 
    ? collectAllPhones(clientData)
    : extractEmailContacts(clientData);
  
  const contactsCount = availableContacts.length;
  
  // Resetar estado apenas quando o modal ABRE (não em cada render)
  useEffect(() => {
    if (!open) return;
    
    // Reset apenas na abertura do modal
    setShowManualInput(false);
    setManualPhone('');
    setManualPhoneError('');
    
    // Só pré-seleciona se houver apenas 1 contato
    if (contactsCount === 1) {
      setSelectedContact(availableContacts[0]?.id || '');
    } else {
      setSelectedContact('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Apenas 'open' como dependência para evitar resets indesejados
  
  const handleManualSend = () => {
    if (!isManualPhoneComplete(manualPhone)) {
      setManualPhoneError('Digite o número completo: (XX) XXXXX-XXXX');
      return;
    }
    
    const normalized = normalizePhoneBR(manualPhone);
    
    if (!normalized) {
      setManualPhoneError('Telefone inválido. Use formato: (XX) XXXXX-XXXX');
      return;
    }
    
    const message = buildMessage(osNumber, pdfUrl, reportAccessToken);
    
    // Usar a função com detecção mobile/desktop
    openWhatsApp(normalized.replace('+', ''), message);
    
    toast({
      title: "WhatsApp aberto",
      description: `Enviando para ${manualPhone}`,
    });
    
    setManualPhone('');
    setManualPhoneError('');
    onOpenChange(false);
  };
  
  const handleSend = () => {
    if (!selectedContact) {
      toast({
        title: "Nenhum destinatário selecionado",
        description: "Selecione um contato para enviar.",
        variant: "destructive",
      });
      return;
    }
    
    const selected = availableContacts.find(c => c.id === selectedContact);
    
    if (!selected) return;
    
    if (mode === 'whatsapp') {
      const message = buildMessage(osNumber, pdfUrl, reportAccessToken);
      const contact = selected as WhatsAppContact;
      
      openWhatsApp(contact.phoneE164.replace('+', ''), message);
      
      toast({
        title: "WhatsApp aberto",
        description: contact.isLikelyWhatsApp
          ? `Enviando para ${contact.name}`
          : `Enviando para ${contact.name} (pode não ter WhatsApp)`,
      });
    } else {
      const contact = selected as EmailContact;
      const subject = encodeURIComponent(`Relatório OS #${osNumber} – ${companyName}`);
      const body = encodeURIComponent(buildEmailBody(osNumber, companyName, reportAccessToken));
      const mailtoLink = `mailto:${contact.email}?subject=${subject}&body=${body}`;
      
      window.location.href = mailtoLink;
      
      toast({
        title: "Cliente de e-mail aberto",
        description: `E-mail preparado para ${contact.name}`,
      });
    }
    
    onOpenChange(false);
  };
  
  const isManualPhoneValid = isManualPhoneComplete(manualPhone);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'whatsapp' ? '📱 ' : '✉️ '}
            Selecione o destinatário
          </DialogTitle>
          <DialogDescription>
            {mode === 'whatsapp'
              ? 'Escolha o contato para enviar o relatório via WhatsApp'
              : 'Escolha o contato para enviar o relatório por e-mail'}
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
                  <RadioGroup
                    value={selectedContact}
                    onValueChange={setSelectedContact}
                    className="space-y-2"
                  >
                    {(availableContacts as WhatsAppContact[]).map(contact => (
                      <div
                        key={contact.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                          selectedContact === contact.id
                            ? "bg-primary/5 border-primary"
                            : contact.isLikelyWhatsApp 
                              ? "hover:bg-green-50 dark:hover:bg-green-950/20 border-muted" 
                              : "hover:bg-amber-50 dark:hover:bg-amber-950/20 border-muted"
                        )}
                        onClick={() => setSelectedContact(contact.id)}
                      >
                        <RadioGroupItem
                          value={contact.id}
                          id={contact.id}
                          className="mt-1"
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
                  </RadioGroup>
                  
                  {/* Opção para digitar outro número - SEMPRE visível */}
                  <div className="pt-3 border-t mt-2">
                    {!showManualInput ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowManualInput(true);
                          setSelectedContact(''); // Limpa seleção ao usar número manual
                        }}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Enviar para outro número
                      </Button>
                    ) : (
                      <div className="space-y-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manual-phone-extra" className="text-sm font-medium">
                            Digite o número:
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setShowManualInput(false);
                              setManualPhone('');
                              setManualPhoneError('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
                              type="tel"
                              inputMode="numeric"
                              placeholder="(41) 99999-9999"
                              className={cn(
                                "text-lg font-mono",
                                manualPhoneError ? 'border-destructive' : ''
                              )}
                              autoFocus
                            />
                          )}
                        </InputMask>
                        {manualPhoneError && (
                          <p className="text-xs text-destructive">{manualPhoneError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          DDD + número com 9 dígitos
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <RadioGroup
                  value={selectedContact}
                  onValueChange={setSelectedContact}
                  className="space-y-2"
                >
                  {(availableContacts as EmailContact[]).map(contact => (
                    <div
                      key={contact.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                        selectedContact === contact.id
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-accent/50"
                      )}
                      onClick={() => setSelectedContact(contact.id)}
                    >
                      <RadioGroupItem
                        value={contact.id}
                        id={contact.id}
                        className="mt-1"
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
                  ))}
                </RadioGroup>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          
          {/* Se está mostrando input manual, mostra botão de enviar para número manual */}
          {showManualInput && mode === 'whatsapp' ? (
            <Button
              onClick={handleManualSend}
              disabled={!isManualPhoneValid}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar para este número
            </Button>
          ) : availableContacts.length === 0 && mode === 'whatsapp' ? (
            <Button
              onClick={handleManualSend}
              disabled={!isManualPhoneValid}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar para este número
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!selectedContact}
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
