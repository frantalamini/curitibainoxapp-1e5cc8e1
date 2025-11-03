import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Mic, Upload, Square, Volume2, X, FileDown, MessageCircle, Clock } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ClientAsyncSelect } from "@/components/ClientAsyncSelect";
import { useTechnicians } from "@/hooks/useTechnicians";
import { Badge } from "@/components/ui/badge";
import { useServiceCalls, useServiceCall, ServiceCallInsert } from "@/hooks/useServiceCalls";
import { useServiceTypes } from "@/hooks/useServiceTypes";
import { useChecklists } from "@/hooks/useChecklists";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

import { SignaturePad } from "@/components/SignaturePad";
import { ChecklistSelector } from "@/components/ChecklistSelector";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TimePickerPopover } from "@/components/TimePickerPopover";
import { Separator } from "@/components/ui/separator";

import { generateOSPdf } from "@/lib/generateOSPdf";
import { uploadPdfToStorage } from "@/lib/pdfUploadHelper";
import { generateSimpleWhatsAppLink } from "@/lib/whatsapp-templates";

const ServiceCallForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Removido useClients() - carregamento assíncrono sob demanda
  const { technicians, isLoading: techniciansLoading } = useTechnicians();
  const { serviceTypes, isLoading: serviceTypesLoading } = useServiceTypes();
  const { checklists, isLoading: checklistsLoading } = useChecklists();
  const { data: existingCall, isLoading: isLoadingCall } = useServiceCall(id);
  const isEditMode = !!id;
  const { createServiceCall, updateServiceCall } = useServiceCalls();
  const { isAdmin, isTechnician } = useUserRole();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState("");
  const [photosBeforeFiles, setPhotosBeforeFiles] = useState<File[]>([]);
  const [videoBeforeFile, setVideoBeforeFile] = useState<File | null>(null);
  const [existingPhotosBeforeUrls, setExistingPhotosBeforeUrls] = useState<string[]>([]);
  const [existingVideoBeforeUrl, setExistingVideoBeforeUrl] = useState<string | null>(null);
  const [photosAfterFiles, setPhotosAfterFiles] = useState<File[]>([]);
  const [videoAfterFile, setVideoAfterFile] = useState<File | null>(null);
  const [existingPhotosAfterUrls, setExistingPhotosAfterUrls] = useState<string[]>([]);
  const [existingVideoAfterUrl, setExistingVideoAfterUrl] = useState<string | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>("");
  const [checklistResponses, setChecklistResponses] = useState<Record<string, boolean>>({});
  const [technicianSignatureData, setTechnicianSignatureData] = useState<string | null>(null);
  const [customerSignatureData, setCustomerSignatureData] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPosition, setCustomerPosition] = useState("");
  const [existingTechnicianSignatureUrl, setExistingTechnicianSignatureUrl] = useState<string | null>(null);
  const [existingCustomerSignatureUrl, setExistingCustomerSignatureUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  const [mediaPreviews, setMediaPreviews] = useState<{file: File, url: string, type: 'image' | 'video'}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [equipmentSerialNumber, setEquipmentSerialNumber] = useState("");
  const [internalNotesText, setInternalNotesText] = useState("");
  
  // Estados para gravação de áudio de informações técnicas
  const [technicalAudioFile, setTechnicalAudioFile] = useState<File | null>(null);
  const [existingTechnicalAudioUrl, setExistingTechnicalAudioUrl] = useState<string | null>(null);
  const [isRecordingTechnical, setIsRecordingTechnical] = useState(false);
  const [technicalMediaRecorder, setTechnicalMediaRecorder] = useState<MediaRecorder | null>(null);
  const [technicalAudioBlob, setTechnicalAudioBlob] = useState<Blob | null>(null);
  const [technicalAudioURL, setTechnicalAudioURL] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceCallInsert>();

  // selectedClient agora é carregado no ClientAsyncSelect via query própria
  const activeTechnicians = technicians?.filter((t) => t.active);
  const activeServiceTypes = serviceTypes?.filter((st) => st.active);
  const selectedChecklist = checklists?.find((c) => c.id === selectedChecklistId);

  useEffect(() => {
    register("client_id");
    register("technician_id");
    register("service_type_id");
    register("scheduled_time");
  }, [register]);

  useEffect(() => {
    if (selectedClientId) {
      setValue("client_id", selectedClientId);
    }
  }, [selectedClientId, setValue]);

  useEffect(() => {
    if (selectedTechnicianId) {
      setValue("technician_id", selectedTechnicianId);
    }
  }, [selectedTechnicianId, setValue]);

  useEffect(() => {
    if (selectedServiceTypeId) {
      setValue("service_type_id", selectedServiceTypeId);
    }
  }, [selectedServiceTypeId, setValue]);

  useEffect(() => {
    if (selectedTime) {
      setValue("scheduled_time", selectedTime);
    }
  }, [selectedTime, setValue]);

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      mediaPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, []);

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
      setExistingAudioUrl(existingCall.audio_url || null);
      setExistingMediaUrls(existingCall.media_urls || []);
      setTechnicalDiagnosis(existingCall.technical_diagnosis || "");
      setExistingPhotosBeforeUrls(existingCall.photos_before_urls || []);
      setExistingVideoBeforeUrl(existingCall.video_before_url || null);
      setExistingPhotosAfterUrls(existingCall.photos_after_urls || []);
      setExistingVideoAfterUrl(existingCall.video_after_url || null);
      setSelectedChecklistId(existingCall.checklist_id || "");
      setChecklistResponses(existingCall.checklist_responses || {});
      setCustomerName(existingCall.customer_name || "");
      setCustomerPosition(existingCall.customer_position || "");
      setExistingTechnicianSignatureUrl(existingCall.technician_signature_url || null);
      setExistingCustomerSignatureUrl(existingCall.customer_signature_url || null);
      setEquipmentSerialNumber(existingCall.equipment_serial_number || "");
      setInternalNotesText(existingCall.internal_notes_text || "");
      setExistingTechnicalAudioUrl(existingCall.technical_diagnosis_audio_url || null);
    }
  }, [existingCall, isEditMode, setValue]);

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

  // Gravação de áudio para informações técnicas (limitado a 1min30s)
  const startRecordingTechnical = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTechnicalAudioBlob(blob);
        setTechnicalAudioURL(URL.createObjectURL(blob));
        
        // Converter Blob para File
        const file = new File([blob], `technical-audio-${Date.now()}.webm`, { 
          type: 'audio/webm' 
        });
        setTechnicalAudioFile(file);
      };

      recorder.start();
      setTechnicalMediaRecorder(recorder);
      setIsRecordingTechnical(true);

      // Limitar gravação a 90 segundos (1min30s)
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecordingTechnical();
        }
      }, 90000);

      toast({
        title: "Gravação Iniciada",
        description: "Duração máxima: 1 minuto e 30 segundos",
      });
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecordingTechnical = () => {
    if (technicalMediaRecorder && technicalMediaRecorder.state === 'recording') {
      technicalMediaRecorder.stop();
      technicalMediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecordingTechnical(false);
    }
  };

  const removeTechnicalAudio = () => {
    setTechnicalAudioFile(null);
    setTechnicalAudioBlob(null);
    setTechnicalAudioURL("");
  };

  const removeExistingTechnicalAudio = () => {
    setExistingTechnicalAudioUrl(null);
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioBlob(null);
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL("");
  };

  const removeExistingAudio = () => {
    setExistingAudioUrl(null);
  };

  const removeExistingMedia = (urlToRemove: string) => {
    setExistingMediaUrls(prev => prev.filter(url => url !== urlToRemove));
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

    if (!selectedTime) {
      toast({
        title: "Erro",
        description: "Selecione um horário para o chamado",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      let audioUrl: string | null = existingAudioUrl;
      let mediaUrls: string[] = [...existingMediaUrls];
      let photosBeforeUrls: string[] = [...existingPhotosBeforeUrls];
      let videoBeforeUrl: string | null = existingVideoBeforeUrl;
      let photosAfterUrls: string[] = [...existingPhotosAfterUrls];
      let videoAfterUrl: string | null = existingVideoAfterUrl;
      let technicianSignatureUrl: string | null = existingTechnicianSignatureUrl;
      let customerSignatureUrl: string | null = existingCustomerSignatureUrl;
      let technicalAudioUrl: string | null = existingTechnicalAudioUrl;

      if (audioFile) {
        const audioPath = `audio/${Date.now()}-${audioFile.name}`;
        const { error: audioError } = await supabase.storage
          .from('service-call-attachments')
          .upload(audioPath, audioFile);

        if (!audioError) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(audioPath);
          audioUrl = publicUrl;
        }
      }

      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `media/${Date.now()}-${Math.random()}.${fileExt}`;
          const { error } = await supabase.storage
            .from('service-call-attachments')
            .upload(filePath, file);

          if (!error) {
            const { data: { publicUrl } } = supabase.storage
              .from('service-call-attachments')
              .getPublicUrl(filePath);
            mediaUrls.push(publicUrl);
          }
        }
      }


      if (photosBeforeFiles.length > 0) {
        for (const file of photosBeforeFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `photos-before/${Date.now()}-${Math.random()}.${fileExt}`;
          const { error } = await supabase.storage
            .from('service-call-attachments')
            .upload(filePath, file);

          if (!error) {
            const { data: { publicUrl } } = supabase.storage
              .from('service-call-attachments')
              .getPublicUrl(filePath);
            photosBeforeUrls.push(publicUrl);
          }
        }
      }

      if (videoBeforeFile) {
        const fileExt = videoBeforeFile.name.split('.').pop();
        const filePath = `video-before/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(filePath, videoBeforeFile);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(filePath);
          videoBeforeUrl = publicUrl;
        }
      }

      if (photosAfterFiles.length > 0) {
        for (const file of photosAfterFiles) {
          const fileExt = file.name.split('.').pop();
          const filePath = `photos-after/${Date.now()}-${Math.random()}.${fileExt}`;
          const { error } = await supabase.storage
            .from('service-call-attachments')
            .upload(filePath, file);

          if (!error) {
            const { data: { publicUrl } } = supabase.storage
              .from('service-call-attachments')
              .getPublicUrl(filePath);
            photosAfterUrls.push(publicUrl);
          }
        }
      }

      if (videoAfterFile) {
        const fileExt = videoAfterFile.name.split('.').pop();
        const filePath = `video-after/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(filePath, videoAfterFile);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(filePath);
          videoAfterUrl = publicUrl;
        }
      }

      if (technicianSignatureData) {
        const blob = await fetch(technicianSignatureData).then(r => r.blob());
        const pngPath = `signatures/tech-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(pngPath, blob, { contentType: 'image/png' });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(pngPath);
          technicianSignatureUrl = publicUrl;
        }
      }

      if (customerSignatureData) {
        const blob = await fetch(customerSignatureData).then(r => r.blob());
        const pngPath = `signatures/customer-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(pngPath, blob, { contentType: 'image/png' });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-call-attachments')
            .getPublicUrl(pngPath);
          customerSignatureUrl = publicUrl;
        }
      }

      // Upload de áudio de informações técnicas
      if (technicalAudioFile) {
        const audioPath = `technical-audio/${Date.now()}-${technicalAudioFile.name}`;
        const { error: audioError } = await supabase.storage
          .from('service-call-attachments')
          .upload(audioPath, technicalAudioFile);

        if (audioError) {
          console.error('Error uploading technical audio:', audioError);
          toast({
            title: "Erro",
            description: "Erro ao fazer upload do áudio de informações técnicas",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('service-call-attachments')
          .getPublicUrl(audioPath);

        technicalAudioUrl = publicUrl;
      }

      const formattedData: any = {
        ...data,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        audio_url: audioUrl,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        technical_diagnosis: technicalDiagnosis || null,
        photos_before_urls: photosBeforeUrls.length > 0 ? photosBeforeUrls : null,
        video_before_url: videoBeforeUrl,
        photos_after_urls: photosAfterUrls.length > 0 ? photosAfterUrls : null,
        video_after_url: videoAfterUrl,
        checklist_id: selectedChecklistId || null,
        checklist_responses: Object.keys(checklistResponses).length > 0 ? checklistResponses : null,
        technician_signature_data: technicianSignatureData,
        technician_signature_url: technicianSignatureUrl,
        customer_signature_data: customerSignatureData,
        customer_signature_url: customerSignatureUrl,
        customer_name: customerName || null,
        customer_position: customerPosition || null,
        technician_signature_date: technicianSignatureData ? new Date().toISOString() : null,
        customer_signature_date: customerSignatureData ? new Date().toISOString() : null,
        equipment_serial_number: equipmentSerialNumber || null,
        internal_notes_text: internalNotesText || null,
        internal_notes_audio_url: null,
        technical_diagnosis_audio_url: technicalAudioUrl,
      };

      if (isEditMode && id) {
        updateServiceCall({ id, ...formattedData });
        toast({
          title: "✅ Chamado Atualizado",
          description: "As alterações foram salvas com sucesso!",
        });
      } else {
        createServiceCall(formattedData);
        toast({
          title: "✅ Chamado Criado",
          description: "Novo chamado criado com sucesso!",
        });
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
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="tecnicas">Informações Técnicas</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais do Chamado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Cliente *</Label>
                    <ClientAsyncSelect
                      value={selectedClientId}
                      onChange={(id) => {
                        setSelectedClientId(id);
                        setValue("client_id", id);
                      }}
                      onNewClientClick={() => setIsClientDialogOpen(true)}
                      error={!!errors.client_id}
                    />
                    {errors.client_id && (
                      <p className="text-sm text-destructive">
                        Selecione um cliente
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
                    {/* Equipamento - 60% da largura (6/10) */}
                    <div className="md:col-span-6 space-y-2">
                      <Label htmlFor="equipment_description">Equipamento *</Label>
                      <Input
                        id="equipment_description"
                        type="text"
                        placeholder="Ex: Ar condicionado split 12000 BTU"
                        {...register("equipment_description", { required: true })}
                      />
                      {errors.equipment_description && (
                        <p className="text-sm text-red-500">Informe o equipamento</p>
                      )}
                    </div>

                    {/* Número de Série - 40% da largura (4/10) */}
                    <div className="md:col-span-4 space-y-2">
                      <Label htmlFor="equipment_serial_number">Número de Série</Label>
                      <Input
                        id="equipment_serial_number"
                        type="text"
                        placeholder="Ex: SN123456789"
                        value={equipmentSerialNumber}
                        onChange={(e) => setEquipmentSerialNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="problem_description">
                      Descrição do Problema
                    </Label>
                    <Textarea
                      id="problem_description"
                      placeholder="Descreva o problema relatado pelo cliente"
                      {...register("problem_description")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technician_id">Técnico Responsável</Label>
                    <Select onValueChange={setSelectedTechnicianId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um técnico" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTechnicians?.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id}>
                            {technician.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.technician_id && (
                      <p className="text-sm text-red-500">
                        Selecione um técnico
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_type_id">Tipo de Serviço</Label>
                    <Select onValueChange={setSelectedServiceTypeId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo de serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeServiceTypes?.map((serviceType) => (
                          <SelectItem key={serviceType.id} value={serviceType.id}>
                            {serviceType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service_type_id && (
                      <p className="text-sm text-red-500">
                        Selecione um tipo de serviço
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checklist_id">Checklist Aplicável</Label>
                    <Select 
                      value={selectedChecklistId} 
                      onValueChange={setSelectedChecklistId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um checklist (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {checklists?.map((checklist) => (
                          <SelectItem key={checklist.id} value={checklist.id}>
                            {checklist.name}
                            {checklist.description && (
                              <span className="text-xs text-muted-foreground ml-2">
                                - {checklist.description}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O checklist selecionado estará disponível na aba "Informações Técnicas"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Data e Hora Agendada</Label>
                    <div className="flex gap-2">
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                setIsDatePickerOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date()
                            }
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <TimePickerPopover
                        value={selectedTime}
                        onChange={(time) => {
                          setSelectedTime(time);
                          setValue("scheduled_time", time, { shouldDirty: true });
                        }}
                        placeholder="--:--"
                      />
                    </div>
                    {errors.scheduled_date && (
                      <p className="text-sm text-red-500">
                        Informe a data e hora
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Anotações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Anotações sobre o chamado"
                      {...register("notes")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gravação de Áudio</Label>
                    {!audioURL && !existingAudioUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isUploading}
                      >
                        {isRecording ? (
                          <>
                            <Square className="mr-2 h-4 w-4 animate-pulse" />
                            Parar de gravar
                          </>
                        ) : (
                          <>
                            <Mic className="mr-2 h-4 w-4" />
                            Gravar áudio
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {audioURL && (
                          <>
                            <audio src={audioURL} controls />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={removeAudio}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {existingAudioUrl && (
                          <>
                            <audio src={existingAudioUrl} controls />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={removeExistingAudio}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Mídia (Fotos/Vídeos)
                    </Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*, video/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newMediaFiles = [...mediaFiles, ...files];
                        setMediaFiles(newMediaFiles);

                        files.forEach(file => {
                          const url = URL.createObjectURL(file);
                          const type = file.type.startsWith('image/') ? 'image' : 'video';
                          setMediaPreviews(prev => [...prev, { file, url, type }]);
                        });
                      }}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          {preview.type === 'image' ? (
                            <img
                              src={preview.url}
                              alt={preview.file.name}
                              className="w-32 h-32 object-cover rounded-md"
                            />
                          ) : (
                            <video
                              src={preview.url}
                              controls
                              className="w-32 h-32 object-cover rounded-md"
                            />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-0 right-0"
                            onClick={() => {
                              setMediaFiles(prev => prev.filter(f => f !== preview.file));
                              setMediaPreviews(prev => prev.filter(p => p.file !== preview.file));
                              URL.revokeObjectURL(preview.url);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {existingMediaUrls.map((url, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <img
                            src={url}
                            alt={`Existing Media ${index}`}
                            className="w-32 h-32 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-0 right-0"
                            onClick={() => removeExistingMedia(url)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observações Internas - Apenas para Admin/Técnico */}
                  {(isAdmin || isTechnician) && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Label 
                            htmlFor="internal_notes_text" 
                            className="text-[#D32F2F] font-bold text-base"
                          >
                            Observações Internas
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            Privado • Admin/Técnico
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Anotações visíveis apenas para administradores e técnicos. Não serão incluídas nos relatórios enviados ao cliente.
                        </p>
                        <Textarea
                          id="internal_notes_text"
                          placeholder="Observações internas sobre o atendimento, peças utilizadas, tempo de execução, etc."
                          value={internalNotesText}
                          onChange={(e) => setInternalNotesText(e.target.value)}
                          maxLength={2000}
                          rows={4}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                          {internalNotesText.length}/2000 caracteres
                        </div>
                      </div>
                    </>
                  )}

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tecnicas">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Técnicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Análises e Providências Realizadas */}
                  <div className="space-y-2">
                    <Label>Análises e Providências Realizadas</Label>
                    <Textarea
                      value={technicalDiagnosis}
                      onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                      placeholder="Descreva as análises realizadas e as providências tomadas durante o atendimento..."
                      rows={8}
                      className="resize-none"
                    />
                  </div>

                  {/* Gravação de Áudio (Informações Técnicas) */}
                  <div className="space-y-2">
                    <Label>Gravação de Áudio (Informações Técnicas)</Label>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duração máxima do áudio: 1 minuto e 30 segundos
                    </p>
                    
                    {!technicalAudioURL && !existingTechnicalAudioUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={isRecordingTechnical ? stopRecordingTechnical : startRecordingTechnical}
                        className="w-full"
                      >
                        <Mic className={`mr-2 h-4 w-4 ${isRecordingTechnical ? 'text-red-500 animate-pulse' : ''}`} />
                        {isRecordingTechnical ? 'Parar Gravação' : 'Gravar Áudio'}
                      </Button>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {technicalAudioURL && (
                          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                            <audio controls src={technicalAudioURL} className="flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeTechnicalAudio}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {existingTechnicalAudioUrl && !technicalAudioURL && (
                          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                            <audio controls src={existingTechnicalAudioUrl} className="flex-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeExistingTechnicalAudio}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fotos/Vídeo Antes */}
                  <div className="space-y-2">
                    <Label>Fotos/Vídeo Antes da Manutenção</Label>
                    <p className="text-xs text-muted-foreground">Máximo: 5 fotos OU 1 vídeo</p>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const images = files.filter(f => f.type.startsWith('image/'));
                        const videos = files.filter(f => f.type.startsWith('video/'));
                        if (images.length > 0) setPhotosBeforeFiles(prev => [...prev, ...images].slice(0, 5));
                        if (videos.length > 0) setVideoBeforeFile(videos[0]);
                      }}
                    />
                  </div>

                  {/* Fotos/Vídeo Depois */}
                  <div className="space-y-2">
                    <Label>Fotos/Vídeo Depois da Manutenção</Label>
                    <p className="text-xs text-muted-foreground">Máximo: 5 fotos OU 1 vídeo</p>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const images = files.filter(f => f.type.startsWith('image/'));
                        const videos = files.filter(f => f.type.startsWith('video/'));
                        if (images.length > 0) setPhotosAfterFiles(prev => [...prev, ...images].slice(0, 5));
                        if (videos.length > 0) setVideoAfterFile(videos[0]);
                      }}
                    />
                  </div>

                  {/* Checklist */}
                  {selectedChecklistId && selectedChecklist && (
                    <ChecklistSelector
                      items={selectedChecklist.items}
                      onChange={setChecklistResponses}
                      initialResponses={checklistResponses}
                    />
                  )}

                  {/* Assinatura Técnico */}
                  <SignaturePad
                    title="Assinatura do Técnico"
                    onSave={(signatureData) => setTechnicianSignatureData(signatureData)}
                  />

                  {/* Assinatura Cliente */}
                  <SignaturePad
                    title="Assinatura do Responsável (Cliente)"
                    showExtraFields
                    onSave={(signatureData, extraFields) => {
                      setCustomerSignatureData(signatureData);
                      if (extraFields) {
                        setCustomerName(extraFields.name || "");
                        setCustomerPosition(extraFields.position || "");
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={isUploading}>
              {isUploading ? "Salvando..." : isEditMode ? "Atualizar Chamado" : "Criar Chamado"}
            </Button>
            {isEditMode && existingCall && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      setIsGeneratingPDF(true);
                      const { blob, fileName, blobUrl } = await generateOSPdf(existingCall.id);
                      
                      // Download automático local
                      const autoLink = document.createElement('a');
                      autoLink.href = blobUrl;
                      autoLink.download = fileName;
                      autoLink.style.display = 'none';
                      document.body.appendChild(autoLink);
                      autoLink.click();
                      document.body.removeChild(autoLink);
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                      
                      // Upload para storage
                      const uploadedUrl = await uploadPdfToStorage(blob, existingCall.id, fileName);
                      setGeneratedPdfUrl(uploadedUrl);
                      
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
                  }}
                  disabled={isGeneratingPDF}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {isGeneratingPDF ? "Gerando..." : "Gerar PDF"}
                </Button>
                {generatedPdfUrl && existingCall.clients && (
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedPdfUrl);
                        const link = generateSimpleWhatsAppLink(existingCall.clients!.phone);
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
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar via WhatsApp
                  </Button>
                )}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/service-calls")}
            >
              Cancelar
            </Button>
          </div>
        </form>

        {/* Dialog de criação de cliente */}
        <ClientFormDialog
          open={isClientDialogOpen}
          onOpenChange={setIsClientDialogOpen}
          onClientCreated={(newClientId) => {
            setSelectedClientId(newClientId);
            setValue("client_id", newClientId);
            setIsClientDialogOpen(false);
          }}
        />
      </div>
    </MainLayout>
  );
};

export default ServiceCallForm;
