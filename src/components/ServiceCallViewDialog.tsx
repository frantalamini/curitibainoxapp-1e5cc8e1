import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
} from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Detalhes do Chamado</DialogTitle>
            <Badge variant={getStatusBadge(call.status).variant}>
              {getStatusBadge(call.status).label}
            </Badge>
          </div>
        </DialogHeader>

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
