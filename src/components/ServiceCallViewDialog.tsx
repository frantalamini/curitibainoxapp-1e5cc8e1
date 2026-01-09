import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Volume2,
  Calendar,
  Clock,
  User,
  Wrench,
  FileText,
  Phone,
  MapPin,
  Image as ImageIcon,
  Video,
  AlertCircle,
  FileDown,
  Stethoscope,
  CheckCircle2,
  XCircle,
  PenTool,
  MessageCircle,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateOSPdf } from "@/lib/generateOSPdf";
import { uploadPdfToStorage } from "@/lib/pdfUploadHelper";
import { generateSimpleWhatsAppLink } from "@/lib/whatsapp-templates";
import { ServiceCall, useMarkServiceCallSeen } from "@/hooks/useServiceCalls";
import { useUserRole } from "@/hooks/useUserRole";
import { useChecklists } from "@/hooks/useChecklists";
import { useEquipment } from "@/hooks/useEquipment";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { SendReportModal } from "@/components/SendReportModal";
import { supabase } from "@/integrations/supabase/client";

const getLatestSignature = (signatures: any[] | undefined, role: 'tech' | 'client') => {
  if (!signatures || !Array.isArray(signatures)) return null;
  const filtered = signatures.filter((s: any) => s.role === role);
  if (filtered.length === 0) return null;
  return filtered.sort((a: any, b: any) => 
    new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime()
  )[0];
};

interface ServiceCallViewDialogProps {
  call: ServiceCall;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ServiceCallViewDialog = ({
  call,
  open,
  onOpenChange,
}: ServiceCallViewDialogProps) => {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [sendWhatsAppModalOpen, setSendWhatsAppModalOpen] = useState(false);
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const { isAdmin, isTechnician } = useUserRole();
  const { checklists } = useChecklists();
  const { equipment } = useEquipment();
  const { settings: systemSettings } = useSystemSettings();
  
  // Marcar como visto ao abrir o modal
  const markSeen = useMarkServiceCallSeen();
  const hasMarkedRef = useRef(false);
  
  useEffect(() => {
    if (open && call.id && !hasMarkedRef.current && !call.seen_by_tech_at) {
      hasMarkedRef.current = true;
      markSeen.mutate(call.id);
    }
    
    // Reset quando fecha
    if (!open) {
      hasMarkedRef.current = false;
    }
  }, [open, call.id, call.seen_by_tech_at]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Aguardando Início", variant: "secondary" as const },
      in_progress: { label: "Em Andamento", variant: "default" as const },
      on_hold: { label: "Com Pendências", variant: "outline" as const },
      completed: { label: "Finalizado", variant: "outline" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // 1. Gerar PDF como Blob usando @react-pdf/renderer
      const { blob, fileName, blobUrl } = await generateOSPdf(call.id);
      setPdfBlob(blob); // Armazena para reutilização
      
      // 2. Download automático local
      const autoLink = document.createElement('a');
      autoLink.href = blobUrl;
      autoLink.download = fileName;
      autoLink.style.display = 'none';
      document.body.appendChild(autoLink);
      autoLink.click();
      document.body.removeChild(autoLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
      // 3. Upload para storage (para WhatsApp)
      const uploadResult = await uploadPdfToStorage(blob, call.id, fileName);
      setPdfUrl(uploadResult.signedUrl);
      
      // 4. Salvar o caminho do PDF no banco de dados
      const { error: updateError } = await supabase
        .from('service_calls')
        .update({ report_pdf_path: uploadResult.filePath })
        .eq('id', call.id);
      
      if (updateError) {
        console.error("Erro ao salvar caminho do PDF:", updateError);
      }
      
      toast({
        title: "✅ PDF gerado com sucesso!",
        description: "Use os botões abaixo para salvar ou compartilhar.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSavePdf = async () => {
    try {
      // Usar Blob já gerado, evitando fetch desnecessário
      if (!pdfBlob) {
        toast({
          title: "PDF não disponível",
          description: "Gere o relatório primeiro",
          variant: "destructive",
        });
        return;
      }

      const fileName = `relatorio-os-${call.os_number}.pdf`;

      // Tentar usar File System Access API (Chrome/Edge HTTPS)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker!({
            suggestedName: fileName,
            types: [
              {
                description: 'Documento PDF',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();

          toast({
            title: "✅ PDF salvo com sucesso!",
            description: `Arquivo salvo: ${fileName}`,
          });
          return; // Sucesso - não precisa do fallback
        } catch (err: any) {
          // Usuário cancelou ou erro de permissão
          if (err.name === 'AbortError') {
            toast({
              title: "Salvamento cancelado",
              description: "Você cancelou o salvamento do arquivo",
            });
            return;
          }
          // Outros erros: cai no fallback abaixo
          console.warn('showSaveFilePicker falhou, usando fallback:', err);
        }
      }

      // Fallback: Download tradicional com <a download>
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast({
        title: "Download iniciado",
        description: `Salvando: ${fileName}`,
      });

    } catch (error) {
      console.error("Erro ao salvar PDF:", error);
      toast({
        title: "Erro ao salvar PDF",
        description: "Não foi possível baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <DialogTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-mono bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded whitespace-nowrap">
                OS #{call.os_number}
              </span>
              <span className="text-base sm:text-lg">Detalhes do Chamado</span>
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-sm"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? "Gerando..." : "Gerar PDF"}
              </Button>
              <Badge variant={getStatusBadge(call.status).variant}>
                {getStatusBadge(call.status).label}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        {pdfUrl && (
          <Card className="mt-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-green-800 dark:text-green-200">
                <FileDown className="w-5 h-5" />
                PDF Gerado com Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                O relatório foi gerado com sucesso. Escolha uma ação:
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleSavePdf}
                  className="flex-1 h-10 px-4 text-sm"
                  variant="default"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  💾 Salvar PDF
                </Button>
                
                <Button
                  onClick={() => setSendWhatsAppModalOpen(true)}
                  className="flex-1 h-10 px-4 text-sm bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                
                <Button
                  onClick={() => setSendEmailModalOpen(true)}
                  className="flex-1 h-10 px-4 text-sm bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  E-mail
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded leading-relaxed">
                <strong>Nota:</strong> Use "Salvar PDF" para escolher onde armazenar o arquivo localmente
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Nome Completo</Label>
                <p className="text-base font-medium leading-relaxed break-words">{call.clients?.full_name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </Label>
                <p className="font-medium whitespace-nowrap">{call.clients?.phone}</p>
              </div>
              {call.clients?.address && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Endereço
                  </Label>
                  <p className="text-sm font-medium leading-relaxed break-words">{call.clients.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Técnico */}
          <Card>
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Técnico Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Nome</Label>
                <p className="text-base font-medium leading-relaxed break-words">{call.technicians?.full_name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </Label>
                <p className="font-medium whitespace-nowrap">{call.technicians?.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Data e Horário */}
          <Card>
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Data</Label>
                <p className="text-base font-medium leading-relaxed">
                  {format(new Date(call.scheduled_date), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Horário
                </Label>
                <p className="font-medium whitespace-nowrap">{call.scheduled_time}</p>
              </div>
              {call.started_at && (
                <div>
                  <Label className="text-sm text-muted-foreground">Iniciado em</Label>
                  <p className="text-sm font-medium whitespace-nowrap">
                    {format(new Date(call.started_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipo de Chamado */}
          {call.service_types && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tipo de Chamado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: call.service_types.color + "20",
                    color: call.service_types.color,
                    border: `1px solid ${call.service_types.color}`,
                  }}
                >
                  {call.service_types.name}
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Descrição do Equipamento e Problema */}
        <div className="grid grid-cols-1 gap-4 mt-4">
          <Card>
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg">Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Descrição</Label>
                <p className="text-sm leading-relaxed break-words mt-1">{call.equipment_description}</p>
              </div>
              {call.equipment_serial_number && (
                <div>
                  <Label className="text-sm text-muted-foreground">Número de Série</Label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block mt-1 whitespace-nowrap">
                    {call.equipment_serial_number}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {call.problem_description && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Descrição do Problema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {call.problem_description}
                </p>
              </CardContent>
            </Card>
          )}

          {call.notes && (
            <Card>
              <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{call.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Áudio Anexado */}
        {call.audio_url && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Áudio Anexado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2">
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
                <audio controls className="w-full" src={call.audio_url}>
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fotos e Vídeos */}
        {call.media_urls && call.media_urls.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Fotos e Vídeos ({call.media_urls.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {call.media_urls.map((url, index) => {
                  const isVideo =
                    url.includes(".mp4") ||
                    url.includes(".webm") ||
                    url.includes(".mov");

                  return (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
                    >
                      {isVideo ? (
                        <div className="relative w-full h-full">
                          <video
                            src={url}
                            controls
                            className="w-full h-full object-cover"
                          >
                            Seu navegador não suporta vídeos.
                          </video>
                          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Vídeo
                          </div>
                        </div>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img
                            src={url}
                            alt={`Anexo ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* INFORMAÇÕES TÉCNICAS */}
        
        {/* Diagnóstico Técnico */}
        {call.technical_diagnosis && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Diagnóstico Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Diagnóstico</Label>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">{call.technical_diagnosis}</p>
              </div>
              {call.technical_diagnosis_audio_url && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Volume2 className="w-3 h-3" />
                    Áudio do Diagnóstico
                  </Label>
                  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
                    <audio controls className="w-full" src={call.technical_diagnosis_audio_url}>
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fotos e Vídeo - Antes da Manutenção */}
        {((call.photos_before_urls && call.photos_before_urls.length > 0) || call.video_before_url) && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Antes da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
              {call.photos_before_urls && call.photos_before_urls.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Fotos ({call.photos_before_urls.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {call.photos_before_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square rounded-lg overflow-hidden border bg-muted group block"
                      >
                        <img
                          src={url}
                          alt={`Foto antes ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {call.video_before_url && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Vídeo
                  </Label>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <video src={call.video_before_url} controls className="w-full h-full">
                      Seu navegador não suporta vídeos.
                    </video>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fotos e Vídeo - Depois da Manutenção */}
        {((call.photos_after_urls && call.photos_after_urls.length > 0) || call.video_after_url) && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Depois da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
              {call.photos_after_urls && call.photos_after_urls.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Fotos ({call.photos_after_urls.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {call.photos_after_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square rounded-lg overflow-hidden border bg-muted group block"
                      >
                        <img
                          src={url}
                          alt={`Foto depois ${index + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {call.video_after_url && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Vídeo
                  </Label>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <video src={call.video_after_url} controls className="w-full h-full">
                      Seu navegador não suporta vídeos.
                    </video>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Checklist de Verificação */}
        {call.checklist_responses && Object.keys(call.checklist_responses).length > 0 && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Checklist de Verificação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2">
              <div className="space-y-2">
                {Object.entries(call.checklist_responses as Record<string, boolean>).map(([item, checked]) => (
                  <div key={item} className="flex items-start gap-2">
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm leading-relaxed break-words", !checked && "text-muted-foreground")}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinaturas */}
        {(() => {
          const latestTech = getLatestSignature((call as any).signatures, 'tech');
          const latestClient = getLatestSignature((call as any).signatures, 'client');
          const hasTech = latestTech || call.technician_signature_url || call.technician_signature_data;
          const hasClient = latestClient || call.customer_signature_url || call.customer_signature_data;
          
          return (hasTech || hasClient) && (
          <Card className="mt-4">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Assinatura do Técnico */}
              {(() => {
                const imgUrl = latestTech?.image_url || call.technician_signature_data || call.technician_signature_url;
                const signedAt = latestTech?.signed_at || call.technician_signature_date;
                const signedBy = latestTech?.signed_by || call.technicians?.full_name;
                
                return imgUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Assinatura do Técnico</Label>
                    <img
                      src={imgUrl}
                      alt="Assinatura do Técnico"
                      className="h-20 border rounded p-2 bg-white w-full object-contain"
                    />
                    <p className="text-sm font-medium break-words">{signedBy}</p>
                    {signedAt && (
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Assinatura do Cliente */}
              {(() => {
                const imgUrl = latestClient?.image_url || call.customer_signature_data || call.customer_signature_url;
                const signedAt = latestClient?.signed_at || call.customer_signature_date;
                const signedBy = latestClient?.signed_by || call.customer_name;
                const position = latestClient?.position || call.customer_position;
                
                return imgUrl && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Assinatura do Responsável (Cliente)</Label>
                    <img
                      src={imgUrl}
                      alt="Assinatura do Cliente"
                      className="h-20 border rounded p-2 bg-white w-full object-contain"
                    />
                    {signedBy && <p className="text-sm font-medium break-words">{signedBy}</p>}
                    {position && (
                      <p className="text-xs text-muted-foreground">Cargo: {position}</p>
                    )}
                    {signedAt && (
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
        })()}

        {/* Observações Internas - Apenas Admin/Técnico */}
        {(isAdmin || isTechnician) && (call.internal_notes_text || call.internal_notes_audio_url) && (
          <Card className="mt-4 border-2 border-dashed border-orange-300 dark:border-orange-800">
            <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Observações Internas
                </CardTitle>
                <Badge variant="secondary" className="text-xs w-fit">
                  Privado • Não enviado ao cliente
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Estas informações são visíveis apenas para administradores e técnicos.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
              {call.internal_notes_text && (
                <div>
                  <Label className="text-sm text-muted-foreground">Anotações</Label>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1 bg-muted/50 p-3 rounded">
                    {call.internal_notes_text}
                  </p>
                </div>
              )}
              {call.internal_notes_audio_url && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Volume2 className="w-3 h-3" />
                    Áudio das Observações
                  </Label>
                  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
                    <audio controls className="w-full" src={call.internal_notes_audio_url}>
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card className="mt-4">
          <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-sm text-muted-foreground">Criado em</Label>
              <p className="whitespace-nowrap">
                {format(new Date(call.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Última atualização</Label>
              <p className="whitespace-nowrap">
                {format(new Date(call.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
      
      {/* Modais de Envio */}
      <SendReportModal
        open={sendWhatsAppModalOpen}
        onOpenChange={setSendWhatsAppModalOpen}
        mode="whatsapp"
        osNumber={call.os_number.toString()}
        pdfUrl={pdfUrl}
        clientData={call.clients!}
        companyName={systemSettings?.company_name || 'Curitiba Inox'}
      />

      <SendReportModal
        open={sendEmailModalOpen}
        onOpenChange={setSendEmailModalOpen}
        mode="email"
        osNumber={call.os_number.toString()}
        pdfUrl={pdfUrl}
        clientData={call.clients!}
        companyName={systemSettings?.company_name || 'Curitiba Inox'}
      />
    </Dialog>
  );
};

export default ServiceCallViewDialog;
