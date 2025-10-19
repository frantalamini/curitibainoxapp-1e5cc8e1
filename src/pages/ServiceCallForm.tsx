import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Mic, Upload, Square, Volume2, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useServiceCalls, useServiceCall, ServiceCallInsert } from "@/hooks/useServiceCalls";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ServiceCallForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clients, isLoading: clientsLoading } = useClients();
  const { technicians, isLoading: techniciansLoading } = useTechnicians();
  const { serviceTypes, isLoading: serviceTypesLoading } = useServiceTypes();
  const { data: existingCall, isLoading: isLoadingCall } = useServiceCall(id);
  const isEditMode = !!id;
  const { createServiceCall, updateServiceCall } = useServiceCalls();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  
  // Estado para previews de mídia
  const [mediaPreviews, setMediaPreviews] = useState<{file: File, url: string, type: 'image' | 'video'}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceCallInsert>();

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const activeTechnicians = technicians?.filter((t) => t.active);
  const activeServiceTypes = serviceTypes?.filter((st) => st.active);

  // Cleanup de URLs ao desmontar
  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      mediaPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, []);

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (existingCall && isEditMode) {
      setValue("client_id", existingCall.client_id);
      setValue("equipment_description", existingCall.equipment_description);
      setValue("problem_description", existingCall.problem_description || "");
      setValue("technician_id", existingCall.technician_id);
      setValue("scheduled_time", existingCall.scheduled_time);
      setValue("notes", existingCall.notes || "");
      setValue("service_type_id", existingCall.service_type_id || "");
      
      setSelectedClientId(existingCall.client_id);
      setSelectedTechnicianId(existingCall.technician_id);
      setSelectedServiceTypeId(existingCall.service_type_id || "");
      setSelectedTime(existingCall.scheduled_time);
      setSelectedDate(new Date(existingCall.scheduled_date));
    }
  }, [existingCall, isEditMode, setValue]);

  // Funções de gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        setAudioFile(new File([blob], 'gravacao.webm', { type: 'audio/webm' }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioBlob(null);
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL("");
  };

  const onSubmit = async (data: ServiceCallInsert) => {
    if (!selectedDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data para o chamado",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      let audioUrl: string | undefined = isEditMode ? existingCall?.audio_url : undefined;
      let mediaUrls: string[] = isEditMode ? (existingCall?.media_urls || []) : [];

      // Upload de novos arquivos (se houver)
      if (audioFile) {
        const audioPath = `audio/${Date.now()}-${audioFile.name}`;
        const { data: audioData, error: audioError } = await supabase.storage
          .from('service-call-attachments')
          .upload(audioPath, audioFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (audioError) {
          console.error('Erro ao enviar áudio:', audioError);
          toast({
            title: "Erro",
            description: "Erro ao enviar o áudio. Tente novamente.",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('service-call-attachments')
          .getPublicUrl(audioPath);
        
        audioUrl = publicUrl;
      }

      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `media/${Date.now()}-${Math.random()}.${fileExt}`;
          
          const { data: mediaData, error: mediaError } = await supabase.storage
            .from('service-call-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (mediaError) {
            console.error('Erro ao enviar mídia:', mediaError);
            toast({
              title: "Aviso",
              description: `Erro ao enviar ${file.name}. Continuando...`,
              variant: "destructive"
            });
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(filePath);
          
          mediaUrls.push(publicUrl);
        }
      }

      const formattedData: any = {
        ...data,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        audio_url: audioUrl,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      };

      console.log("📦 Dados que serão salvos:", formattedData);
      console.log("🎵 Audio URL:", audioUrl);
      console.log("📸 Media URLs:", mediaUrls);

      if (isEditMode && id) {
        updateServiceCall({ id, ...formattedData });
      } else {
        createServiceCall(formattedData);
      }
      
      navigate("/service-calls");
    } catch (error) {
      console.error('Erro ao salvar chamado:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o chamado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingCall && isEditMode) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-8">
          <div>Carregando dados do chamado...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Editar Chamado Técnico" : "Novo Chamado Técnico"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? "Editar informações do chamado de serviço" : "Criar novo chamado de serviço"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Chamado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  disabled={clientsLoading}
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setValue("client_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && (
                  <p className="text-sm text-destructive">Cliente é obrigatório</p>
                )}

                {selectedClient && (
                  <Card className="mt-2">
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Nome:</span> {selectedClient.full_name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Telefone:</span> {selectedClient.phone}
                      </p>
                      {selectedClient.address && (
                        <p className="text-sm">
                          <span className="font-medium">Endereço:</span>{" "}
                          {selectedClient.street && `${selectedClient.street}, `}
                          {selectedClient.number && `${selectedClient.number}, `}
                          {selectedClient.neighborhood && `${selectedClient.neighborhood}, `}
                          {selectedClient.city && `${selectedClient.city} - `}
                          {selectedClient.state}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Equipamento */}
              <div className="space-y-2">
                <Label htmlFor="equipment_description">Equipamento *</Label>
                <Input
                  id="equipment_description"
                  placeholder="Descreva o equipamento"
                  {...register("equipment_description", { required: true })}
                />
                {errors.equipment_description && (
                  <p className="text-sm text-destructive">Equipamento é obrigatório</p>
                )}
              </div>

              {/* Descrição do Problema */}
              <div className="space-y-2">
                <Label htmlFor="problem_description">Descrição do Problema</Label>
                <Textarea
                  id="problem_description"
                  placeholder="Descreva o problema relatado pelo cliente"
                  {...register("problem_description")}
                  rows={3}
                />
              </div>

              {/* Tipo de Chamado */}
              <div className="space-y-2">
                <Label htmlFor="service_type">Tipo de Chamado *</Label>
                <Select
                  disabled={serviceTypesLoading}
                  value={selectedServiceTypeId}
                  onValueChange={(value) => {
                    setSelectedServiceTypeId(value);
                    setValue("service_type_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de chamado" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service_type_id && (
                  <p className="text-sm text-destructive">Tipo de chamado é obrigatório</p>
                )}
              </div>

              {/* Técnico */}
              <div className="space-y-2">
                <Label htmlFor="technician">Técnico Responsável *</Label>
                <Select
                  disabled={techniciansLoading}
                  value={selectedTechnicianId}
                  onValueChange={(value) => {
                    setSelectedTechnicianId(value);
                    setValue("technician_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTechnicians?.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name}
                        {tech.specialty_cooking && " - Cocção"}
                        {tech.specialty_refrigeration && " - Refrigeração"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.technician_id && (
                  <p className="text-sm text-destructive">Técnico é obrigatório</p>
                )}
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-4">
                {/* Data */}
                <div className="space-y-2">
                  <Label>Data do Agendamento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                        }}
                        onDayClick={(date) => {
                          setSelectedDate(date);
                          setTimeout(() => document.body.click(), 100);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {!selectedDate && (
                    <p className="text-sm text-destructive">Data é obrigatória</p>
                  )}
                </div>

                {/* Horário */}
                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Horário *</Label>
                  <Input
                    type="time"
                    className="w-full"
                    value={selectedTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTime(value);
                      setValue("scheduled_time", value);
                    }}
                  />
                  {errors.scheduled_time && (
                    <p className="text-sm text-destructive">Horário é obrigatório</p>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais sobre o chamado"
                  {...register("notes")}
                  rows={4}
                />
                
                {/* Seção de Áudio */}
                <div className="space-y-3 pt-2">
                  <Label>Áudio</Label>
                  
                  {/* Botões de ação */}
                  <div className="flex gap-2">
                    {!audioFile && !isRecording && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startRecording}
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          Gravar Áudio
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('audio-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Anexar Áudio
                        </Button>
                      </>
                    )}
                    
                    {isRecording && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopRecording}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Parar Gravação
                      </Button>
                    )}
                  </div>
                  
                  {/* Preview do áudio anexado */}
                  {audioFile && (
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Volume2 className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Áudio anexado ✓</p>
                            <p className="text-xs text-muted-foreground">{audioFile.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeAudio}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Player de áudio */}
                      {(audioURL || audioFile) && (
                        <audio 
                          controls 
                          className="w-full mt-3"
                          src={audioURL || URL.createObjectURL(audioFile)}
                        />
                      )}
                    </Card>
                  )}
                  
                  {/* Input hidden para upload */}
                  <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAudioFile(file);
                        setAudioURL(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Fotos e Vídeos */}
              <div className="space-y-2">
                <Label htmlFor="media">Fotos e Vídeos</Label>
                
                {/* Botão de upload */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('media-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {mediaFiles.length > 0 ? "Adicionar mais arquivos" : "Anexar Fotos/Vídeos"}
                </Button>
                
                {/* Input hidden */}
                <input
                  id="media-upload"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setMediaFiles(prev => [...prev, ...files]);
                    
                    // Criar previews
                    const newPreviews = files.map(file => ({
                      file,
                      url: URL.createObjectURL(file),
                      type: file.type.startsWith('image/') ? 'image' as const : 'video' as const
                    }));
                    setMediaPreviews(prev => [...prev, ...newPreviews]);
                  }}
                />
                
                {/* Preview dos arquivos anexados */}
                {mediaPreviews.length > 0 && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">
                        {mediaPreviews.length} arquivo(s) anexado(s)
                      </p>
                    </div>
                    
                    {/* Grid de previews */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          {preview.type === 'image' ? (
                            // Preview de imagem
                            <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                              <img
                                src={preview.url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  // Remover arquivo
                                  URL.revokeObjectURL(preview.url);
                                  setMediaPreviews(prev => prev.filter((_, i) => i !== index));
                                  setMediaFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            // Preview de vídeo
                            <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                              <video
                                src={preview.url}
                                controls
                                className="w-full h-full object-cover"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  // Remover arquivo
                                  URL.revokeObjectURL(preview.url);
                                  setMediaPreviews(prev => prev.filter((_, i) => i !== index));
                                  setMediaFiles(prev => prev.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {preview.file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={isUploading || isLoadingCall}>
              {isUploading ? "Enviando arquivos..." : isEditMode ? "Atualizar Chamado" : "Criar Chamado"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/service-calls")} disabled={isUploading}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ServiceCallForm;
