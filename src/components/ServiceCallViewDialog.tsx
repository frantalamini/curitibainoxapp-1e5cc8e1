import { useState } from "react";
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
  Mail,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateServiceCallReport } from "@/lib/reportPdfGenerator";
import { uploadPdfToStorage } from "@/lib/pdfUploadHelper";
import { generateSimpleWhatsAppLink } from "@/lib/whatsapp-templates";
import { ServiceCall } from "@/hooks/useServiceCalls";

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
      const pdf = await generateServiceCallReport(call);
      pdf.save(`Relatorio-Chamado-${call.id.substring(0, 8)}.pdf`);
      
      // Upload para storage
      const uploadedUrl = await uploadPdfToStorage(pdf, call.id);
      setPdfUrl(uploadedUrl);
      
      toast({
        title: "PDF Gerado!",
        description: "O relatório foi baixado e está pronto para envio.",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Detalhes do Chamado</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? "Gerando..." : "Gerar Relatório PDF"}
              </Button>
              <Badge variant={getStatusBadge(call.status).variant}>
                {getStatusBadge(call.status).label}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        {pdfUrl && call.clients && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200 mb-3">
              📄 PDF gerado com sucesso! Envie para o cliente via WhatsApp:
            </p>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pdfUrl);
                  const link = generateSimpleWhatsAppLink(call.clients!.phone);
                  window.open(link, '_blank');
                  
                  toast({
                    title: "Link copiado!",
                    description: "Cole o link do PDF na conversa do WhatsApp",
                  });
                } catch (error) {
                  console.error("Erro ao copiar link:", error);
                  toast({
                    title: "Erro",
                    description: "Não foi possível copiar o link",
                    variant: "destructive",
                  });
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar Relatório via WhatsApp
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Nome Completo</Label>
                <p className="font-medium">{call.clients?.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </Label>
                <p className="font-medium">{call.clients?.phone}</p>
              </div>
              {call.clients?.address && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Endereço
                  </Label>
                  <p className="font-medium text-sm">{call.clients.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Técnico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Técnico Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{call.technicians?.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </Label>
                <p className="font-medium">{call.technicians?.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Data e Horário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Data</Label>
                <p className="font-medium">
                  {format(new Date(call.scheduled_date), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Horário
                </Label>
                <p className="font-medium">{call.scheduled_time}</p>
              </div>
              {call.started_at && (
                <div>
                  <Label className="text-muted-foreground">Iniciado em</Label>
                  <p className="font-medium text-sm">
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tipo de Chamado
                </CardTitle>
              </CardHeader>
              <CardContent>
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
            <CardHeader>
              <CardTitle className="text-lg">Equipamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{call.equipment_description}</p>
            </CardContent>
          </Card>

          {call.problem_description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Descrição do Problema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {call.problem_description}
                </p>
              </CardContent>
            </Card>
          )}

          {call.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{call.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Áudio Anexado */}
        {call.audio_url && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Áudio Anexado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Fotos e Vídeos ({call.media_urls.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Diagnóstico Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Diagnóstico</Label>
                <p className="text-sm whitespace-pre-wrap mt-1">{call.technical_diagnosis}</p>
              </div>
              {call.technical_diagnosis_audio_url && (
                <div>
                  <Label className="text-muted-foreground flex items-center gap-1 mb-2">
                    <Volume2 className="w-3 h-3" />
                    Áudio do Diagnóstico
                  </Label>
                  <div className="bg-muted/50 p-4 rounded-lg">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Antes da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {call.photos_before_urls && call.photos_before_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Fotos ({call.photos_before_urls.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  <Label className="text-muted-foreground mb-2 block flex items-center gap-1">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Depois da Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {call.photos_after_urls && call.photos_after_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Fotos ({call.photos_after_urls.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  <Label className="text-muted-foreground mb-2 block flex items-center gap-1">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Checklist de Verificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(call.checklist_responses as Record<string, boolean>).map(([item, checked]) => (
                  <div key={item} className="flex items-center gap-2">
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={cn("text-sm", !checked && "text-muted-foreground")}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinaturas */}
        {(call.technician_signature_url || call.technician_signature_data || call.customer_signature_url || call.customer_signature_data) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assinatura do Técnico */}
              {(call.technician_signature_url || call.technician_signature_data) && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assinatura do Técnico</Label>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <img
                      src={call.technician_signature_data || call.technician_signature_url || ""}
                      alt="Assinatura do Técnico"
                      className="w-full h-24 object-contain"
                    />
                  </div>
                  <p className="text-sm font-medium">{call.technicians?.full_name}</p>
                  {call.technician_signature_date && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(call.technician_signature_date), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Assinatura do Cliente */}
              {(call.customer_signature_url || call.customer_signature_data) && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Assinatura do Cliente</Label>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <img
                      src={call.customer_signature_data || call.customer_signature_url || ""}
                      alt="Assinatura do Cliente"
                      className="w-full h-24 object-contain"
                    />
                  </div>
                  {call.customer_name && (
                    <p className="text-sm font-medium">{call.customer_name}</p>
                  )}
                  {call.customer_position && (
                    <p className="text-xs text-muted-foreground">Cargo: {call.customer_position}</p>
                  )}
                  {call.customer_signature_date && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(call.customer_signature_date), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Criado em</Label>
              <p>
                {format(new Date(call.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Última atualização</Label>
              <p>
                {format(new Date(call.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceCallViewDialog;
