import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Mic, Upload, Square, Volume2, X, FileDown, MessageCircle, Mail, Clock, Car, MapPin, AlertCircle, DollarSign, Pencil, Save, ArrowLeft, FileText, Stethoscope, Eye, Download } from "lucide-react";
import { parseLocalDate } from "@/lib/dateUtils";
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
import { SendReportModal } from "@/components/SendReportModal";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";

import { SignaturePad } from "@/components/SignaturePad";
import { SignatureModal } from "@/components/SignatureModal";
import { ChecklistSelector } from "@/components/ChecklistSelector";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TimePickerPopover } from "@/components/TimePickerPopover";
import { Separator } from "@/components/ui/separator";
import { MediaSlots } from "@/components/MediaSlots";

import { generateOSPdf, markOSWithFinancialReport } from "@/lib/generateOSPdf";
import { uploadPdfToStorage } from "@/lib/pdfUploadHelper";
import { generateSimpleWhatsAppLink } from "@/lib/whatsapp-templates";
import { StartTripModal } from "@/components/StartTripModal";
import { EndTripModal } from "@/components/EndTripModal";
import { useOpenTrip, useHasCompletedTrip, useServiceCallTripsMutations } from "@/hooks/useServiceCallTrips";
import { useGpsTracking } from "@/hooks/useGpsTracking";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FinanceiroGuard } from "@/components/os-financeiro/FinanceiroGuard";
import { ServiceCallChat } from "@/components/service-calls/ServiceCallChat";
import { StatusSelectField } from "@/components/service-calls/StatusSelectField";
import { useServiceCallStatuses } from "@/hooks/useServiceCallStatuses";
import { useCurrentUserPermissions } from "@/hooks/useUserPermissions";

type Signature = {
  image_url: string; // Pode ser caminho no storage OU URL completa (legacy)
  storage_path?: string; // Caminho explícito no storage (novo formato)
  signed_at: string;
  signed_by?: string;
  position?: string;
  role: 'tech' | 'client';
};

const ServiceCallForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Removido useClients() - carregamento assíncrono sob demanda
  const { technicians, isLoading: techniciansLoading } = useTechnicians();
  const { serviceTypes, isLoading: serviceTypesLoading } = useServiceTypes();
  const { checklists, isLoading: checklistsLoading } = useChecklists();
  const { data: existingCall, isLoading: isLoadingCall, refetch: refetchCall } = useServiceCall(id);
  const isEditMode = !!id;
  const { createServiceCallAsync, updateServiceCallAsync } = useServiceCalls();
  const { isAdmin, isTechnician, loading: rolesLoading } = useUserRole();
  const { statuses: allStatuses } = useServiceCallStatuses();
  const { data: currentUserPerms, isLoading: permsLoading } = useCurrentUserPermissions();
  const isGerencial = currentUserPerms?.profileType === "gerencial";
  
  // Estado de modo readonly - inicia como true em edição (isEditMode = !!id), false em criação
  const [isReadonly, setIsReadonly] = useState(!!id);
  
  // Técnicos não podem editar a aba Geral mesmo em modo edição
  // Apenas ADM/Gerencial podem editar todas as abas
  // IMPORTANTE: Só aplicar restrição APÓS roles carregarem para evitar falsos negativos
  const isGeralReadonly = !rolesLoading && isTechnician && !isAdmin;
  
  // Estados para deslocamentos
  const [startTripModalOpen, setStartTripModalOpen] = useState(false);
  const [endTripModalOpen, setEndTripModalOpen] = useState(false);
  const { data: activeTrip } = useOpenTrip(id);
  const { data: hasCompletedTrip } = useHasCompletedTrip(id);
  const { createTrip, updateTrip, isCreating: isCreatingTrip, isUpdating: isUpdatingTrip } = useServiceCallTripsMutations();
  
  // Rastreamento GPS automático durante deslocamento ativo
  useGpsTracking(activeTrip);
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [dateInputText, setDateInputText] = useState<string>("");
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
  const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [selectedCommercialStatusId, setSelectedCommercialStatusId] = useState<string>("");
  const [sendWhatsAppModalOpen, setSendWhatsAppModalOpen] = useState(false);
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const { settings: systemSettings } = useSystemSettings();
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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [equipmentSerialNumber, setEquipmentSerialNumber] = useState("");
  const [internalNotesText, setInternalNotesText] = useState("");
  const [defectFound, setDefectFound] = useState("");
  
  // Estados para os modais de assinatura
  const [openTechSignatureModal, setOpenTechSignatureModal] = useState(false);
  const [openClientSignatureModal, setOpenClientSignatureModal] = useState(false);
  const [newSignatures, setNewSignatures] = useState<Signature[]>([]);
  
  // Estados para gravação de áudio de informações técnicas
  const [technicalAudioFile, setTechnicalAudioFile] = useState<File | null>(null);
  const [existingTechnicalAudioUrl, setExistingTechnicalAudioUrl] = useState<string | null>(null);
  const [isRecordingTechnical, setIsRecordingTechnical] = useState(false);
  const [technicalMediaRecorder, setTechnicalMediaRecorder] = useState<MediaRecorder | null>(null);
  const [technicalAudioBlob, setTechnicalAudioBlob] = useState<Blob | null>(null);
  const [technicalAudioURL, setTechnicalAudioURL] = useState<string>("");
  
  // Ref para chunks de áudio técnico (evita problemas de closure)
  const technicalAudioChunksRef = useRef<BlobPart[]>([]);
  
  // Flag para evitar re-inicialização do formulário quando queries são invalidadas
  const initializedRef = useRef(false);
  
  // Ref para rastrear se o componente está montado (evita erros de state em componentes desmontados)
  const isMountedRef = useRef(true);

  // Ao navegar para fora (ex: Voltar), marcamos como não-montado antes da navegação
  // para impedir toasts/updates que podem disparar no exato momento do back.
  const handleBack = () => {
    isMountedRef.current = false;
    navigate("/service-calls");
  };
  
  // Cleanup do blob URL do PDF quando componente desmonta ou URL muda
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);
  
  // Estados de preview removidos - MediaSlots gerencia internamente

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

  // OS bloqueada quando status comercial é "Faturado"
  // Gerencial pode editar mesmo faturada; ADM e Técnicos ficam bloqueados
  const isStatusFaturado = !!selectedCommercialStatusId && !!allStatuses?.some(
    s => s.id === selectedCommercialStatusId && s.name.toLowerCase() === 'faturado'
  );
  const isFaturado = isStatusFaturado && !isGerencial;

  // Função helper para obter assinatura mais recente por role (banco + novas pendentes)
  const getCurrentSignature = (existingSignatures: any[] | undefined, newSigs: Signature[], role: 'tech' | 'client') => {
    // Combinar assinaturas existentes com novas ainda não salvas
    const allSignatures = [
      ...(existingSignatures || []),
      ...newSigs
    ].filter((s: any) => s.role === role);
    
    if (allSignatures.length === 0) return null;
    return allSignatures.sort((a: any, b: any) => 
      new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime()
    )[0];
  };

  // Mostra assinatura mais recente (incluindo novas ainda não salvas)
  const currentTechSignature = getCurrentSignature((existingCall as any)?.signatures, newSignatures, 'tech');
  const currentClientSignature = getCurrentSignature((existingCall as any)?.signatures, newSignatures, 'client');

  // Função helper para construir endereço completo
  const buildFullAddress = (client: any) => {
    if (!client) return "";
    const parts = [
      client.street,
      client.number,
      client.complement,
      client.neighborhood,
      client.city,
      client.state,
      client.cep
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Handlers para deslocamentos
  const handleStartTrip = async (data: {
    vehicleId: string;
    originLat: number;
    originLng: number;
    destinationLat: number | null;
    destinationLng: number | null;
    estimatedDistanceKm: number | null;
  }) => {
    if (!id || !existingCall) return;

    // Buscar quilometragem atual do veículo ANTES de qualquer navegação
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("current_odometer_km")
      .eq("id", data.vehicleId)
      .single();

    const startOdometer = vehicleData?.current_odometer_km || 0;

    // Criar o trip no banco de dados ANTES de abrir o GPS
    // Isso garante que o deslocamento é registrado mesmo se o usuário sair do app
    createTrip({
      service_call_id: id,
      technician_id: existingCall.technician_id,
      vehicle_id: data.vehicleId,
      start_odometer_km: startOdometer,
      origin_lat: data.originLat,
      origin_lng: data.originLng,
      destination_lat: data.destinationLat ?? undefined,
      destination_lng: data.destinationLng ?? undefined,
      estimated_distance_km: data.estimatedDistanceKm ?? undefined,
      current_lat: data.originLat,
      current_lng: data.originLng,
    });

    setStartTripModalOpen(false);

    // Abrir Google Maps DEPOIS de registrar o trip
    // No iOS/PWA, usamos location.href para garantir que abra (window.open é bloqueado)
    if (existingCall.clients) {
      const address = buildFullAddress(existingCall.clients);
      if (address) {
        const encodedAddress = encodeURIComponent(address);
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // Pequeno delay para garantir que o trip foi registrado
        setTimeout(() => {
          if (isIOS) {
            // iOS: abrir na mesma aba (única forma garantida de funcionar em PWA)
            window.location.href = mapsUrl;
          } else {
            const newWindow = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
            if (!newWindow) {
              toast({
                variant: "destructive",
                title: "Pop-up bloqueado",
                description: "O navegador bloqueou a abertura do GPS. Permita pop-ups para este site e tente novamente.",
              });
            }
          }
        }, 300);
      }
    }
  };

  const handleEndTrip = async (endOdometer: number | null) => {
    if (!activeTrip) return;

    const updates: any = {
      finished_at: new Date().toISOString(),
      status: 'concluido',
    };

    // Se quilometragem informada, calcular distância e atualizar veículo
    if (endOdometer !== null) {
      const distance = endOdometer - activeTrip.start_odometer_km;
      updates.end_odometer_km = endOdometer;
      updates.distance_km = distance;
      
      // Atualizar vehicles.current_odometer_km
      await supabase
        .from("vehicles")
        .update({ current_odometer_km: endOdometer })
        .eq("id", activeTrip.vehicle_id);
    }

    updateTrip({
      id: activeTrip.id,
      updates,
    });

    setEndTripModalOpen(false);
  };

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

  // Cleanup de URLs e marcação de componente desmontado
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (technicalAudioURL) URL.revokeObjectURL(technicalAudioURL);
      mediaPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      // Cleanup de previews de fotos/vídeos agora é feito pelo MediaSlots
    };
  }, []);

  // Resetar flag quando muda de OS (id muda)
  useEffect(() => {
    initializedRef.current = false;
  }, [id]);

  // CHECK DE REGRESSÃO: Verifica se a aba Financeiro existe no DOM em modo edição
  // Se este check falhar, significa que algo removeu a aba indevidamente
  useEffect(() => {
    if (isEditMode) {
      const checkFinanceiroTab = () => {
        const financeiroTrigger = document.querySelector('[data-testid="financeiro-tab-trigger"]');
        const financeiroContent = document.querySelector('[data-testid="financeiro-tab-content"]');
        
        if (!financeiroTrigger) {
          console.error(
            "🚨 REGRESSÃO DETECTADA: Aba Financeiro (trigger) não encontrada no DOM!",
            { isEditMode, id, pathname: window.location.pathname }
          );
        }
        if (!financeiroContent) {
          console.error(
            "🚨 REGRESSÃO DETECTADA: Aba Financeiro (content) não encontrada no DOM!",
            { isEditMode, id, pathname: window.location.pathname }
          );
        }
        if (financeiroTrigger && financeiroContent) {
          console.log("✅ Check Financeiro: Aba presente no DOM");
        }
      };
      
      // Verificar após render completo
      const timeout = setTimeout(checkFinanceiroTab, 500);
      return () => clearTimeout(timeout);
    }
  }, [isEditMode, id]);

  // Inicializa formulário apenas UMA VEZ quando existingCall é carregado
  // Evita re-inicialização quando queries (products, etc) são invalidadas
  useEffect(() => {
    if (existingCall && isEditMode && !initializedRef.current) {
      setValue("client_id", existingCall.client_id);
      setValue("equipment_description", existingCall.equipment_description);
      setValue("problem_description", existingCall.problem_description || "");
      setValue("technician_id", existingCall.technician_id);
      setValue("scheduled_time", existingCall.scheduled_time);
      setValue("notes", existingCall.notes || "");
      setValue("service_type_id", existingCall.service_type_id || "");
      // Novos campos: Fabricante e Setor
      setValue("equipment_manufacturer", (existingCall as any).equipment_manufacturer || "");
      setValue("equipment_sector", (existingCall as any).equipment_sector || "");
      
      setSelectedClientId(existingCall.client_id);
      setSelectedTechnicianId(existingCall.technician_id);
      setSelectedServiceTypeId(existingCall.service_type_id || "");
      setSelectedTime(existingCall.scheduled_time);
      const parsedDate = parseLocalDate(existingCall.scheduled_date);
      setSelectedDate(parsedDate);
      setDateInputText(format(parsedDate, "dd/MM/yyyy"));
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
      setDefectFound((existingCall as any).defect_found || "");
      setExistingTechnicalAudioUrl(existingCall.technical_diagnosis_audio_url || null);
      setSelectedStatusId(existingCall.status_id || "");
      setSelectedCommercialStatusId(existingCall.commercial_status_id || "");
      
      // Marca como inicializado para evitar re-inicializações dos campos do form
      initializedRef.current = true;
    }
    
    // SEMPRE verificar se existe relatório gerado (mesmo após refetch)
    // Isso garante que os botões PDF/WhatsApp apareçam após gerar relatório
    // Priorizar report_access_token - se existir, podemos montar a URL pública
    // mesmo sem report_pdf_path (que pode ter falhado silenciosamente)
    // IMPORTANTE: Se o técnico está bloqueado (has_financial_report=true), NÃO mostrar
    // o link do PDF armazenado pois pode conter dados financeiros do admin
    const isTechBlocked = isTechnician && !isAdmin && (existingCall as any)?.has_financial_report;
    if (existingCall && isEditMode && (existingCall as any).report_access_token && !isTechBlocked) {
      const pdfUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${(existingCall as any).report_access_token}`;
      setGeneratedPdfUrl(pdfUrl);
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
      // Verificar suporte do navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Erro",
          description: "Seu navegador não suporta gravação de áudio",
          variant: "destructive"
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Verificar suporte ao MediaRecorder
      if (!window.MediaRecorder) {
        toast({
          title: "Erro", 
          description: "Seu navegador não suporta gravação de áudio",
          variant: "destructive"
        });
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      // Determinar melhor mimeType suportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      technicalAudioChunksRef.current = []; // Limpar chunks anteriores

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          technicalAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const chunks = technicalAudioChunksRef.current;
        if (chunks.length === 0) {
          toast({
            title: "Erro",
            description: "Nenhum áudio foi capturado",
            variant: "destructive"
          });
          return;
        }
        
        const blob = new Blob(chunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        setTechnicalAudioBlob(blob);
        setTechnicalAudioURL(audioUrl);
        
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const file = new File([blob], `technical-audio-${Date.now()}.${extension}`, { 
          type: mimeType 
        });
        setTechnicalAudioFile(file);
        
        toast({
          title: "Gravação Concluída",
          description: "Áudio gravado com sucesso!",
        });
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Erro na Gravação",
          description: "Ocorreu um erro durante a gravação",
          variant: "destructive"
        });
        setIsRecordingTechnical(false);
      };

      // Iniciar gravação com timeslice para garantir dados periódicos
      recorder.start(1000); // Captura dados a cada 1 segundo
      setTechnicalMediaRecorder(recorder);
      setIsRecordingTechnical(true);

      // Limitar a 90 segundos
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecordingTechnical();
        }
      }, 90000);

      toast({
        title: "Gravação Iniciada",
        description: "Duração máxima: 1 minuto e 30 segundos",
      });

    } catch (error: any) {
      console.error('Erro ao acessar microfone:', error);
      
      let errorMessage = "Não foi possível acessar o microfone";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Nenhum microfone encontrado no dispositivo";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
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
    // Bloquear submit enquanto roles estão carregando para evitar validações incorretas
    if (rolesLoading) {
      toast({
        title: "Aguarde",
        description: "Carregando informações do usuário...",
        variant: "default"
      });
      return;
    }

    // Para técnicos editando, usar valores do existingCall para campos readonly da aba Geral
    // Isso evita erros de validação quando o técnico só pode editar a aba Técnico
    const effectiveClientId = (isGeralReadonly && isEditMode && existingCall) 
      ? existingCall.client_id 
      : selectedClientId;
    const effectiveTechnicianId = (isGeralReadonly && isEditMode && existingCall) 
      ? existingCall.technician_id 
      : selectedTechnicianId;
    const effectiveServiceTypeId = (isGeralReadonly && isEditMode && existingCall) 
      ? (existingCall.service_type_id || "") 
      : selectedServiceTypeId;
    const effectiveDate = (isGeralReadonly && isEditMode && existingCall) 
      ? parseLocalDate(existingCall.scheduled_date) 
      : selectedDate;
    const effectiveTime = (isGeralReadonly && isEditMode && existingCall) 
      ? existingCall.scheduled_time 
      : selectedTime;

    if (!effectiveClientId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para o chamado",
        variant: "destructive"
      });
      return;
    }

    if (!effectiveTechnicianId) {
      toast({
        title: "Erro",
        description: "Selecione um técnico responsável para o chamado",
        variant: "destructive"
      });
      return;
    }

    if (!effectiveDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data para o chamado",
        variant: "destructive"
      });
      return;
    }

    if (!effectiveTime) {
      toast({
        title: "Erro",
        description: "Selecione um horário para o chamado",
        variant: "destructive"
      });
      return;
    }

    if (!effectiveServiceTypeId) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de serviço para o chamado",
        variant: "destructive"
      });
      return;
    }

    // Validação do campo "Defeito Encontrado" (obrigatório em modo edição)
    if (isEditMode && !defectFound.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o campo 'Defeito Encontrado' na aba Informações Técnicas",
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
          const { data: signedData } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(audioPath, 31536000); // 1 ano
          audioUrl = signedData?.signedUrl || '';
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
            const { data: signedData } = await supabase.storage
              .from('service-call-attachments')
              .createSignedUrl(filePath, 31536000); // 1 ano
            if (signedData?.signedUrl) mediaUrls.push(signedData.signedUrl);
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
            const { data: signedData } = await supabase.storage
              .from('service-call-attachments')
              .createSignedUrl(filePath, 31536000); // 1 ano
            if (signedData?.signedUrl) photosBeforeUrls.push(signedData.signedUrl);
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
          const { data: signedData } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(filePath, 31536000); // 1 ano
          videoBeforeUrl = signedData?.signedUrl || '';
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
            const { data: signedData } = await supabase.storage
              .from('service-call-attachments')
              .createSignedUrl(filePath, 31536000); // 1 ano
            if (signedData?.signedUrl) photosAfterUrls.push(signedData.signedUrl);
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
          const { data: signedData } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(filePath, 31536000); // 1 ano
          videoAfterUrl = signedData?.signedUrl || '';
        }
      }

      if (technicianSignatureData) {
        const blob = await fetch(technicianSignatureData).then(r => r.blob());
        const pngPath = `signatures/tech-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(pngPath, blob, { contentType: 'image/png' });

        if (!error) {
          const { data: signedData } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(pngPath, 31536000); // 1 ano
          technicianSignatureUrl = signedData?.signedUrl || '';
        }
      }

      if (customerSignatureData) {
        const blob = await fetch(customerSignatureData).then(r => r.blob());
        const pngPath = `signatures/customer-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from('service-call-attachments')
          .upload(pngPath, blob, { contentType: 'image/png' });

        if (!error) {
          const { data: signedData } = await supabase.storage
            .from('service-call-attachments')
            .createSignedUrl(pngPath, 31536000); // 1 ano
          customerSignatureUrl = signedData?.signedUrl || '';
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

        const { data: signedData } = await supabase.storage
          .from('service-call-attachments')
          .createSignedUrl(audioPath, 31536000); // 1 ano

        technicalAudioUrl = signedData?.signedUrl || '';
      }

      // Processar assinaturas - upload base64 para storage antes de salvar
      const processedSignatures: Signature[] = [...((existingCall as any)?.signatures || [])];
      
      for (const sig of newSignatures) {
        // Se é base64, fazer upload para storage
        if (sig.image_url.startsWith('data:')) {
          try {
            const blob = await fetch(sig.image_url).then(r => r.blob());
            const fileName = `signatures/${id || 'new'}-${sig.role}-${Date.now()}.png`;
            
            const { error } = await supabase.storage
              .from('service-call-attachments')
              .upload(fileName, blob, { 
                contentType: 'image/png',
                upsert: true 
              });

            if (error) throw error;

            // IMPORTANTE: Salvar o CAMINHO do arquivo, não a signed URL
            // Isso evita problemas de expiração - a signed URL será gerada no momento de uso
            processedSignatures.push({
              ...sig,
              image_url: fileName, // Caminho relativo no bucket
              storage_path: fileName // Campo explícito para clareza
            });
          } catch (err) {
            console.error('Erro ao fazer upload da assinatura:', err);
            toast({
              title: "Erro na assinatura",
              description: "Falha ao salvar assinatura. Tente novamente.",
              variant: "destructive"
            });
            setIsUploading(false);
            return; // Abortar submit
          }
        } else {
          // Já é URL ou path, manter como está
          processedSignatures.push(sig);
        }
      }

      const formattedData: any = {
        ...data,
        client_id: effectiveClientId,
        technician_id: effectiveTechnicianId,
        service_type_id: effectiveServiceTypeId || null,
        scheduled_date: format(effectiveDate!, "yyyy-MM-dd"),
        scheduled_time: effectiveTime,
        audio_url: audioUrl,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        technical_diagnosis: technicalDiagnosis || null,
        defect_found: defectFound || null,
        photos_before_urls: photosBeforeUrls.length > 0 ? photosBeforeUrls : null,
        video_before_url: videoBeforeUrl,
        photos_after_urls: photosAfterUrls.length > 0 ? photosAfterUrls : null,
        video_after_url: videoAfterUrl,
        checklist_id: selectedChecklistId || null,
        checklist_responses: Object.keys(checklistResponses).length > 0 ? checklistResponses : null,
        equipment_serial_number: equipmentSerialNumber || null,
        internal_notes_text: internalNotesText || null,
        internal_notes_audio_url: null,
        technical_diagnosis_audio_url: technicalAudioUrl,
        // Novos campos: Fabricante e Setor
        equipment_manufacturer: data.equipment_manufacturer || null,
        equipment_sector: data.equipment_sector || null,
        // Assinaturas: usar as processadas (com URLs do storage em vez de base64)
        signatures: processedSignatures,
        // Status - apenas incluir se estamos em modo edição
        ...(isEditMode ? {
          status_id: selectedStatusId || null,
          commercial_status_id: selectedCommercialStatusId || null,
        } : {}),
        // Manter campos antigos para compatibilidade (deprecated)
        technician_signature_data: (existingCall as any)?.technician_signature_data || null,
        technician_signature_url: (existingCall as any)?.technician_signature_url || null,
        customer_signature_data: (existingCall as any)?.customer_signature_data || null,
        customer_signature_url: (existingCall as any)?.customer_signature_url || null,
        customer_name: (existingCall as any)?.customer_name || null,
        customer_position: (existingCall as any)?.customer_position || null,
        technician_signature_date: (existingCall as any)?.technician_signature_date || null,
        customer_signature_date: (existingCall as any)?.customer_signature_date || null,
      };

      if (isEditMode && id) {
        try {
          await updateServiceCallAsync({ id, ...formattedData });
          setNewSignatures([]); // Limpar após salvar
          
          // Recarregar dados da OS após salvar para atualizar assinaturas e PDF
          await refetchCall();
          
          // Voltar ao modo readonly e permanecer na OS
          setIsReadonly(true);
          
          // Habilitar botões de PDF/WhatsApp se relatório já existe
          const { data: updatedCall } = await supabase
            .from("service_calls")
            .select("report_pdf_path, report_access_token, os_number")
            .eq("id", id)
            .single();
          
          if (updatedCall?.report_pdf_path && updatedCall?.report_access_token) {
            setGeneratedPdfUrl(`https://curitibainoxapp.com/relatorio-os/${updatedCall.os_number}/${updatedCall.report_access_token}`);
          }
          
          toast({
            title: "✅ Chamado Atualizado",
            description: "As alterações foram salvas com sucesso!",
          });
        } catch (updateError) {
          console.error('Erro ao atualizar chamado:', updateError);
          // Toast já é exibido pelo hook useServiceCalls
        }
      } else {
        // Buscar IDs dos status padrão para novo chamado
        const { data: defaultTechnicalStatus } = await supabase
          .from("service_call_statuses")
          .select("id")
          .eq("name", "Aguardando Início")
          .eq("status_type", "tecnico")
          .maybeSingle();

        const { data: defaultCommercialStatus } = await supabase
          .from("service_call_statuses")
          .select("id")
          .eq("name", "Aguardando aprovação")
          .eq("status_type", "comercial")
          .maybeSingle();

        try {
          await createServiceCallAsync({
            ...formattedData,
            status_id: defaultTechnicalStatus?.id,
            commercial_status_id: defaultCommercialStatus?.id,
          });
          setNewSignatures([]); // Limpar após criar
          toast({
            title: "✅ Chamado Criado",
            description: "Novo chamado criado com sucesso!",
          });
          
          // Apenas novo chamado redireciona para lista
          navigate("/service-calls");
        } catch (createError) {
          console.error('Erro ao criar chamado:', createError);
          // Toast de erro já é exibido pelo hook useServiceCalls
        }
      }
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
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
        {/* Header com Breadcrumb e Botões de Ação */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">›</span>
            <span className="text-muted-foreground text-sm">Chamados</span>
            {isEditMode && existingCall && (
              <>
                <span className="text-muted-foreground">›</span>
                <span className="font-semibold text-sm">OS #{existingCall.os_number}</span>
              </>
            )}
            {!isEditMode && (
              <>
                <span className="text-muted-foreground">›</span>
                <span className="font-semibold text-sm">Novo Chamado</span>
              </>
            )}
          </div>
          
          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditMode && isReadonly && !isFaturado && (
              <Button type="button" onClick={() => setIsReadonly(false)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {isFaturado && (
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                OS Faturada — Edição bloqueada
              </Badge>
            )}
            
            {/* Botões de edição no header - apenas desktop */}
            {isEditMode && !isReadonly && (
              <div className="hidden md:flex gap-2">
                <Button type="button" disabled={isUploading} onClick={handleSubmit(onSubmit)}>
                  <Save className="mr-2 h-4 w-4" />
                  {isUploading ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    // Cancelar edição - voltar ao modo readonly e restaurar dados
                    initializedRef.current = false;
                    refetchCall();
                    setIsReadonly(true);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            
            {!isEditMode && (
              <Button type="button" disabled={isUploading} onClick={handleSubmit(onSubmit)}>
                {isUploading ? "Salvando..." : "Criar Chamado"}
              </Button>
            )}
          </div>
        </div>

        {/* Banner de Deslocamento - sempre visível no topo para OS em edição */}
        {isEditMode && (isAdmin || isTechnician) && (
          <Card className="mb-6 border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Car className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-900">Deslocamento</span>
              </div>

              {/* Estado 1: Não iniciado */}
              {!activeTrip && !hasCompletedTrip && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Deslocamento ainda não iniciado.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setStartTripModalOpen(true)}
                    disabled={isCreatingTrip}
                  >
                    <Car className="mr-2 h-4 w-4" />
                    {isCreatingTrip ? "Iniciando..." : "Iniciar Deslocamento"}
                  </Button>
                </div>
              )}

              {/* Estado 2: Em andamento */}
              {activeTrip && activeTrip.started_at && (
                <div className="space-y-3">
                  <Alert className="border-amber-200 bg-amber-50">
                    <Car className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Deslocamento em andamento desde {format(new Date(activeTrip.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    onClick={() => setEndTripModalOpen(true)}
                    disabled={isUpdatingTrip}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {isUpdatingTrip ? "Finalizando..." : "Cheguei no Cliente"}
                  </Button>
                </div>
              )}

              {/* Estado 3: Concluído */}
              {!activeTrip && hasCompletedTrip && (
                <Alert className="border-green-200 bg-green-50">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Deslocamento concluído.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="geral" className="w-full">
            {/* 
              BLINDAGEM: A aba Financeiro SEMPRE existe em modo edição.
              A decisão de mostrar conteúdo ou placeholder é feita pelo FinanceiroGuard.
              NÃO REMOVER esta estrutura - ela garante que a aba nunca "some".
            */}
            <TabsList className={cn(
              "grid w-full mb-6",
              isEditMode 
                ? (isTechnician && !isAdmin ? "grid-cols-3" : "grid-cols-4")
                : "grid-cols-2"
            )}>
              <TabsTrigger value="geral" className="flex items-center justify-center gap-1.5">
                <FileText className="w-4 h-4 sm:hidden" />
                <span>Geral</span>
              </TabsTrigger>
              <TabsTrigger value="tecnicas" className="flex items-center justify-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                <span className="hidden sm:inline">Informações Técnicas</span>
                <span className="sm:hidden">Técnico</span>
              </TabsTrigger>
              {isEditMode && !(isTechnician && !isAdmin) && (
                <TabsTrigger 
                  value="financeiro" 
                  className="flex items-center justify-center gap-1.5"
                  data-testid="financeiro-tab-trigger"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Financeiro</span>
                  <span className="sm:hidden">$</span>
                </TabsTrigger>
              )}
              {isEditMode && (
                <TabsTrigger 
                  value="chat" 
                  className="flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
              )}
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
                      disabled={(isReadonly || isGeralReadonly) && isEditMode}
                    />
                    {errors.client_id && (
                      <p className="text-sm text-destructive">
                        Selecione um cliente
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Equipamento - 4/12 */}
                    <div className="lg:col-span-4 space-y-2">
                      <Label htmlFor="equipment_description">Equipamento *</Label>
                      <Input
                        id="equipment_description"
                        type="text"
                        placeholder="Ex: Ar condicionado split 12000 BTU"
                        disabled={(isReadonly || isGeralReadonly) && isEditMode}
                        className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        {...register("equipment_description", { required: true })}
                      />
                      {errors.equipment_description && (
                        <p className="text-sm text-red-500">Informe o equipamento</p>
                      )}
                    </div>

                    {/* Fabricante - 2/12 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label htmlFor="equipment_manufacturer">Fabricante</Label>
                      <Input
                        id="equipment_manufacturer"
                        type="text"
                        placeholder="Ex: Samsung"
                        disabled={(isReadonly || isGeralReadonly) && isEditMode}
                        className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        {...register("equipment_manufacturer")}
                      />
                    </div>

                    {/* Setor - 2/12 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label htmlFor="equipment_sector">Setor</Label>
                      <Input
                        id="equipment_sector"
                        type="text"
                        placeholder="Ex: Cozinha"
                        disabled={(isReadonly || isGeralReadonly) && isEditMode}
                        className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        {...register("equipment_sector")}
                      />
                    </div>

                    {/* Número de Série - 2/12 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label htmlFor="equipment_serial_number">Nº Série</Label>
                      <Input
                        id="equipment_serial_number"
                        type="text"
                        placeholder="SN123456"
                        value={equipmentSerialNumber}
                        onChange={(e) => setEquipmentSerialNumber(e.target.value)}
                        disabled={(isReadonly || isGeralReadonly) && isEditMode}
                        className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                      />
                    </div>

                    {/* Número da OC - 2/12 */}
                    <div className="lg:col-span-2 space-y-2">
                      <Label htmlFor="purchase_order_number">OC</Label>
                      <Input
                        id="purchase_order_number"
                        type="text"
                        placeholder="OC-12345"
                        disabled={(isReadonly || isGeralReadonly) && isEditMode}
                        className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        {...register("purchase_order_number")}
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
                      disabled={(isReadonly || isGeralReadonly) && isEditMode}
                      className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                      {...register("problem_description")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technician_id">Técnico Responsável</Label>
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId} disabled={(isReadonly || isGeralReadonly) && isEditMode}>
                <SelectTrigger className={cn("w-full", (isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}>
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
                    <Label htmlFor="service_type_id">Tipo de Serviço *</Label>
              <Select value={selectedServiceTypeId} onValueChange={setSelectedServiceTypeId} disabled={(isReadonly || isGeralReadonly) && isEditMode}>
                <SelectTrigger className={cn("w-full", (isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}>
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

                  {/* Status Técnico e Status Comercial - apenas em modo edição */}
                  {isEditMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StatusSelectField
                        statusType="tecnico"
                        value={selectedStatusId}
                        onChange={setSelectedStatusId}
                        disabled={isReadonly}
                      />
                      <StatusSelectField
                        statusType="comercial"
                        value={selectedCommercialStatusId}
                        onChange={setSelectedCommercialStatusId}
                        disabled={isReadonly}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="checklist_id">Checklist Aplicável</Label>
                    <Select 
                      value={selectedChecklistId} 
                      onValueChange={setSelectedChecklistId}
                      disabled={(isReadonly || isGeralReadonly) && isEditMode}
                    >
                      <SelectTrigger className={cn("w-full", (isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}>
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
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* Input de data digitável + calendário */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={dateInputText}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d/]/g, '');
                            // Auto-formatar com /
                            if ((value.length === 2 || value.length === 5) && !value.endsWith('/') && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
                              value = value + '/';
                            }
                            if (value.length <= 10) {
                              setDateInputText(value);
                              // Tentar parsear a data no formato DD/MM/AAAA
                              const parts = value.split('/');
                              if (parts.length === 3 && parts[2]?.length === 4) {
                                const day = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1;
                                const year = parseInt(parts[2], 10);
                                if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
                                  const date = new Date(year, month, day);
                                  if (date.getDate() === day && date.getMonth() === month) {
                                    setSelectedDate(date);
                                  }
                                }
                              }
                            }
                          }}
                          disabled={(isReadonly || isGeralReadonly) && isEditMode}
                          className={cn("w-[120px]", (isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        />
                        <Popover open={((isReadonly || isGeralReadonly) && isEditMode) ? false : isDatePickerOpen} onOpenChange={((isReadonly || isGeralReadonly) && isEditMode) ? undefined : setIsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={(isReadonly || isGeralReadonly) && isEditMode}
                              type="button"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  setSelectedDate(date);
                                  setDateInputText(format(date, "dd/MM/yyyy"));
                                  setIsDatePickerOpen(false);
                                }
                              }}
                              // TEMPORÁRIO: Desabilitado para permitir inserção de OS antigas
                              // disabled={(date) => {
                              //   const today = new Date();
                              //   today.setHours(0, 0, 0, 0);
                              //   return date < today;
                              // }}
                              locale={ptBR}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Input de hora digitável + seletor */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          placeholder="HH:MM"
                          value={selectedTime}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d:]/g, '');
                            // Auto-formatar com :
                            if (value.length === 2 && !value.includes(':') && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType !== 'deleteContentBackward') {
                              value = value + ':';
                            }
                            if (value.length <= 5) {
                              setSelectedTime(value);
                              if (value.length === 5) {
                                setValue("scheduled_time", value, { shouldDirty: true });
                              }
                            }
                          }}
                          disabled={(isReadonly || isGeralReadonly) && isEditMode}
                          className={cn("w-[80px]", (isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                        />
                        <TimePickerPopover
                          value={selectedTime}
                          onChange={(time) => {
                            setSelectedTime(time);
                            setValue("scheduled_time", time, { shouldDirty: true });
                          }}
                          disabled={(isReadonly || isGeralReadonly) && isEditMode}
                          trigger={
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={(isReadonly || isGeralReadonly) && isEditMode}
                              type="button"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
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
                      disabled={(isReadonly || isGeralReadonly) && isEditMode}
                      className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
                      {...register("notes")}
                    />
                  </div>

                  {!((isReadonly || isGeralReadonly) && isEditMode) && (
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
                  )}

                  {/* Exibir áudio existente em modo readonly */}
                  {(isReadonly && isEditMode) && existingAudioUrl && (
                    <div className="space-y-2">
                      <Label>Gravação de Áudio</Label>
                      <audio src={existingAudioUrl} controls />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>
                      Mídia (Fotos/Vídeos)
                    </Label>
                    {!(isReadonly && isEditMode) && (
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
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {!(isReadonly && isEditMode) && mediaPreviews.map((preview, index) => (
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
                          {!(isReadonly && isEditMode) && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-0 right-0"
                              onClick={() => removeExistingMedia(url)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
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
                          disabled={(isReadonly || isGeralReadonly) && isEditMode}
                          className={cn((isReadonly || isGeralReadonly) && isEditMode && "bg-muted")}
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
                  {/* Bloqueio se não houver deslocamento concluído */}
                  {isEditMode && !hasCompletedTrip && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Para preencher as informações técnicas, finalize primeiro o deslocamento clicando em "Cheguei no Cliente" no banner de Deslocamento acima.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className={cn(
                    "space-y-6",
                    isEditMode && !hasCompletedTrip && "opacity-50 pointer-events-none",
                    isReadonly && isEditMode && "pointer-events-none"
                  )}>
                  {/* Defeito Encontrado */}
                  <div className="space-y-2">
                    <Label>Defeito Encontrado *</Label>
                    <Textarea
                      value={defectFound}
                      onChange={(e) => setDefectFound(e.target.value)}
                      placeholder="Descreva o defeito encontrado no equipamento..."
                      rows={4}
                      maxLength={1000}
                      className={cn("resize-none", isReadonly && isEditMode && "bg-muted")}
                      disabled={isReadonly && isEditMode}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{defectFound.length}/1000</p>
                  </div>

                  {/* Análises e Providências Realizadas */}
                  <div className="space-y-2">
                    <Label>Análises e Providências Realizadas</Label>
                    <Textarea
                      value={technicalDiagnosis}
                      onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                      placeholder="Descreva as análises realizadas e as providências tomadas durante o atendimento..."
                      rows={8}
                      className={cn("resize-none", isReadonly && isEditMode && "bg-muted")}
                      disabled={isReadonly && isEditMode}
                    />
                  </div>

                  {/* Mídia Antes da Manutenção */}
                  <MediaSlots
                    mode="before"
                    photoFiles={photosBeforeFiles}
                    videoFile={videoBeforeFile}
                    existingPhotoUrls={existingPhotosBeforeUrls}
                    existingVideoUrl={existingVideoBeforeUrl}
                    onPhotoFilesChange={setPhotosBeforeFiles}
                    onVideoFileChange={setVideoBeforeFile}
                    onExistingPhotoUrlsChange={setExistingPhotosBeforeUrls}
                    onExistingVideoUrlChange={setExistingVideoBeforeUrl}
                    disabled={isUploading || (isReadonly && isEditMode)}
                  />

                  {/* Checklist */}
                  {selectedChecklistId && selectedChecklist && (
                    <ChecklistSelector
                      items={selectedChecklist.items}
                      onChange={setChecklistResponses}
                      initialResponses={checklistResponses}
                    />
                  )}

                  {/* Mídia Depois da Manutenção */}
                  <MediaSlots
                    mode="after"
                    photoFiles={photosAfterFiles}
                    videoFile={videoAfterFile}
                    existingPhotoUrls={existingPhotosAfterUrls}
                    existingVideoUrl={existingVideoAfterUrl}
                    onPhotoFilesChange={setPhotosAfterFiles}
                    onVideoFileChange={setVideoAfterFile}
                    onExistingPhotoUrlsChange={setExistingPhotosAfterUrls}
                    onExistingVideoUrlChange={setExistingVideoAfterUrl}
                    disabled={isUploading || (isReadonly && isEditMode)}
                  />

                  {/* Assinatura do Técnico - Read Only */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Assinatura do Técnico</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentTechSignature ? (
                        <div className="space-y-2">
                          <div className={`border-2 rounded-lg p-4 ${
                            newSignatures.some(s => s.role === 'tech' && s.image_url === currentTechSignature.image_url)
                              ? 'border-primary bg-primary/5'
                              : 'border-muted bg-muted/10'
                          }`}>
                            <img
                              src={currentTechSignature.image_url}
                              alt="Assinatura do técnico"
                              className="h-24 w-full object-contain pointer-events-none select-none"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {newSignatures.some(s => s.role === 'tech' && s.image_url === currentTechSignature.image_url) ? (
                              <span className="text-primary font-medium">⏳ Pendente de salvar • </span>
                            ) : null}
                            Assinado em {format(new Date(currentTechSignature.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {currentTechSignature.signed_by && ` • ${currentTechSignature.signed_by}`}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma assinatura registrada.
                        </p>
                      )}
                      {!isReadonly && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpenTechSignatureModal(true)}
                        >
                          {currentTechSignature ? "Adicionar nova assinatura" : "Adicionar assinatura"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assinatura do Cliente - Read Only */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Assinatura do Responsável (Cliente)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentClientSignature ? (
                        <div className="space-y-2">
                          <div className={`border-2 rounded-lg p-4 ${
                            newSignatures.some(s => s.role === 'client' && s.image_url === currentClientSignature.image_url)
                              ? 'border-primary bg-primary/5'
                              : 'border-muted bg-muted/10'
                          }`}>
                            <img
                              src={currentClientSignature.image_url}
                              alt="Assinatura do cliente"
                              className="h-24 w-full object-contain pointer-events-none select-none"
                            />
                          </div>
                          <div className="space-y-1">
                            {newSignatures.some(s => s.role === 'client' && s.image_url === currentClientSignature.image_url) && (
                              <p className="text-xs text-primary font-medium">⏳ Pendente de salvar</p>
                            )}
                            <p className="text-sm font-medium">{currentClientSignature.signed_by}</p>
                            {currentClientSignature.position && (
                              <p className="text-xs text-muted-foreground">Cargo: {currentClientSignature.position}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Assinado em {format(new Date(currentClientSignature.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma assinatura registrada.
                        </p>
                      )}
                      {!isReadonly && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpenClientSignatureModal(true)}
                        >
                          {currentClientSignature ? "Adicionar nova assinatura" : "Adicionar assinatura"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 
              BLINDAGEM: Aba Financeiro SEMPRE presente em modo edição.
              O FinanceiroGuard gerencia internamente:
              - Loading: mostra "Carregando permissões..."
              - Erro: mostra alerta com botão retry
              - Não-admin: mostra placeholder "Acesso Restrito"
              - Admin: renderiza FinanceiroTab
              
              NÃO REMOVER ou CONDICIONAR esta TabsContent!
            */}
            {isEditMode && !(isTechnician && !isAdmin) && (
              <TabsContent value="financeiro" data-testid="financeiro-tab-content">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Financeiro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FinanceiroGuard 
                      serviceCallId={id!} 
                      clientId={selectedClientId} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Aba 4: Chat Interno */}
            {isEditMode && existingCall && (
              <TabsContent value="chat">
                <ServiceCallChat 
                  serviceCallId={id!} 
                  osNumber={existingCall.os_number} 
                />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex gap-4 mt-6 flex-wrap">
            {/* Botão Salvar no mobile - posicionado antes dos PDFs */}
            {isEditMode && !isReadonly && (
              <div className="w-full md:hidden flex gap-2 mb-2">
                <Button type="button" disabled={isUploading} onClick={handleSubmit(onSubmit)} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {isUploading ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    initializedRef.current = false;
                    refetchCall();
                    setIsReadonly(true);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            
            {isEditMode && existingCall && (
              <>
                {/* Verificar se técnico está bloqueado */}
                {isTechnician && !isAdmin && (existingCall as any).has_financial_report ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    title="Relatório financeiro já gerado. Técnicos não podem mais acessar."
                  >
                    <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                    PDF Bloqueado
                  </Button>
                ) : (
                  <>
                    {/* Técnico: apenas PDF técnico */}
                    {isTechnician && !isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            setIsGeneratingPDF(true);
                            const { blob, fileName, blobUrl } = await generateOSPdf(existingCall.id, { includeFinancial: false });
                            
                            // Armazenar blob para download posterior sob controle do usuário
                            // NÃO navegar automaticamente para evitar perda de estado
                            setPdfBlobUrl(blobUrl);
                            setPdfBlob(blob);
                            
                            // Upload para storage
                            const uploadResult = await uploadPdfToStorage(blob, existingCall.id, fileName);
                            
                            // Usar URL pública para o modal de envio
                            const publicUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${uploadResult.newAccessToken}`;
                            setGeneratedPdfUrl(publicUrl);
                            
                            // Salvar o caminho do PDF no banco de dados
                            const { error: updateError } = await supabase
                              .from('service_calls')
                              .update({ report_pdf_path: uploadResult.filePath })
                              .eq('id', existingCall.id);
                            
                            if (updateError) {
                              console.error("Erro ao salvar caminho do PDF:", updateError);
                            }
                            
                            // Refetch para sincronizar dados do relatório
                            await refetchCall();
                            
                            toast({
                              title: "PDF Técnico Gerado!",
                              description: "Use os botões abaixo para visualizar, salvar ou enviar.",
                            });
                          } catch (error: any) {
                            console.error("Error generating PDF:", error);
                            // Só mostrar erro se componente ainda estiver montado
                            // E não for erro de abort (navegação)
                            const isAbortError = error?.name === 'AbortError' || 
                                                 error?.message?.includes('abort') ||
                                                 error?.message?.includes('cancel');
                            if (isMountedRef.current && !isAbortError) {
                              toast({
                                title: "Erro ao gerar PDF",
                                description: "Ocorreu um erro ao gerar o relatório.",
                                variant: "destructive",
                              });
                            }
                          } finally {
                            if (isMountedRef.current) {
                              setIsGeneratingPDF(false);
                            }
                          }
                        }}
                        disabled={isGeneratingPDF}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        {isGeneratingPDF ? "Gerando..." : "PDF Técnico"}
                      </Button>
                    )}
                    
                    {/* Admin: ambas opções */}
                    {isAdmin && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              setIsGeneratingPDF(true);
                              const { blob, fileName, blobUrl } = await generateOSPdf(existingCall.id, { includeFinancial: false });
                              
                              // Armazenar blob para download posterior sob controle do usuário
                              setPdfBlobUrl(blobUrl);
                              setPdfBlob(blob);
                              
                              const uploadResult = await uploadPdfToStorage(blob, existingCall.id, fileName);
                              
                              // Usar URL pública para o modal de envio
                              const publicUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${uploadResult.newAccessToken}`;
                              setGeneratedPdfUrl(publicUrl);
                              
                              const { error: updateError } = await supabase
                                .from('service_calls')
                                .update({ report_pdf_path: uploadResult.filePath })
                                .eq('id', existingCall.id);
                              
                              if (updateError) {
                                console.error("Erro ao salvar caminho do PDF:", updateError);
                              }
                              
                              // Refetch para sincronizar dados do relatório
                              await refetchCall();
                              
                              toast({
                                title: "PDF Técnico Gerado!",
                                description: "Use os botões abaixo para visualizar, salvar ou enviar.",
                              });
                            } catch (error: any) {
                              console.error("Error generating PDF:", error);
                              // Só mostrar erro se componente ainda estiver montado
                              // E não for erro de abort (navegação)
                              const isAbortError = error?.name === 'AbortError' || 
                                                   error?.message?.includes('abort') ||
                                                   error?.message?.includes('cancel');
                              if (isMountedRef.current && !isAbortError) {
                                toast({
                                  title: "Erro ao gerar PDF",
                                  description: "Ocorreu um erro ao gerar o relatório.",
                                  variant: "destructive",
                                });
                              }
                            } finally {
                              if (isMountedRef.current) {
                                setIsGeneratingPDF(false);
                              }
                            }
                          }}
                          disabled={isGeneratingPDF}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          {isGeneratingPDF ? "Gerando..." : "PDF Técnico"}
                        </Button>
                        
                        <Button
                          type="button"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            try {
                              setIsGeneratingPDF(true);
                              const { blob, fileName, blobUrl } = await generateOSPdf(existingCall.id, { includeFinancial: true });
                              
                              // Armazenar blob para download posterior sob controle do usuário
                              setPdfBlobUrl(blobUrl);
                              setPdfBlob(blob);
                              
                              const uploadResult = await uploadPdfToStorage(blob, existingCall.id, fileName);
                              
                              // Usar URL pública para o modal de envio
                              const publicUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${uploadResult.newAccessToken}`;
                              setGeneratedPdfUrl(publicUrl);
                              
                              const { error: updateError } = await supabase
                                .from('service_calls')
                                .update({ report_pdf_path: uploadResult.filePath })
                                .eq('id', existingCall.id);
                              
                              if (updateError) {
                                console.error("Erro ao salvar caminho do PDF:", updateError);
                              }
                              
                              // Marcar a OS como tendo relatório financeiro
                              await markOSWithFinancialReport(existingCall.id);
                              
                              // Refetch para atualizar o estado
                              await refetchCall();
                              
                              toast({
                                title: "PDF Completo Gerado!",
                                description: "Use os botões abaixo para visualizar, salvar ou enviar.",
                              });
                            } catch (error: any) {
                              console.error("Error generating PDF:", error);
                              // Só mostrar erro se componente ainda estiver montado
                              // E não for erro de abort (navegação)
                              const isAbortError = error?.name === 'AbortError' || 
                                                   error?.message?.includes('abort') ||
                                                   error?.message?.includes('cancel');
                              if (isMountedRef.current && !isAbortError) {
                                toast({
                                  title: "Erro ao gerar PDF",
                                  description: "Ocorreu um erro ao gerar o relatório.",
                                  variant: "destructive",
                                });
                              }
                            } finally {
                              if (isMountedRef.current) {
                                setIsGeneratingPDF(false);
                              }
                            }
                          }}
                          disabled={isGeneratingPDF}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          {isGeneratingPDF ? "Gerando..." : "PDF Completo"}
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                {(generatedPdfUrl || pdfBlobUrl) && existingCall && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                      ✓ PDF gerado com sucesso
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Visualizar PDF */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const url = generatedPdfUrl || pdfBlobUrl;
                          if (url) window.open(url, '_blank');
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar PDF
                      </Button>
                      
                      {/* Salvar PDF (download) */}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const clientData = existingCall.clients as any;
                            const clientPart = clientData?.nome_fantasia
                              ? clientData.nome_fantasia.split(' ').slice(0, 2).join(' ')
                              : clientData?.full_name?.split(' ')[0] || 'Cliente';
                            const pdfFilename = `${clientPart} - OS${existingCall.os_number}.pdf`;

                            if (pdfBlobUrl) {
                              const link = document.createElement('a');
                              link.href = pdfBlobUrl;
                              link.download = pdfFilename;
                              link.click();
                            } else if ((existingCall as any)?.report_pdf_path) {
                              const { data: signedData, error: signedError } = await supabase.storage
                                .from('service-call-attachments')
                                .createSignedUrl((existingCall as any).report_pdf_path, 3600);
                              if (signedError || !signedData) {
                                toast({ title: "Erro ao gerar link de download", variant: "destructive" });
                                return;
                              }
                              const res = await fetch(signedData.signedUrl);
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = pdfFilename;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          } catch (e) {
                            console.error('Erro ao salvar PDF:', e);
                            toast({ title: "Erro ao salvar PDF", variant: "destructive" });
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Salvar PDF
                      </Button>
                      
                      {/* WhatsApp */}
                      <Button
                        type="button"
                        onClick={() => setSendWhatsAppModalOpen(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                      
                      {/* E-mail */}
                      <Button
                        type="button"
                        onClick={() => setSendEmailModalOpen(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        E-mail
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </form>

        {/* Modal de Assinatura do Técnico */}
        <SignatureModal
          open={openTechSignatureModal}
          title="Nova Assinatura do Técnico"
          onCancel={() => setOpenTechSignatureModal(false)}
          onSave={(dataUrl) => {
            const technicianName = activeTechnicians?.find(t => t.id === selectedTechnicianId)?.full_name || 'Técnico';
            const newSignature: Signature = {
              image_url: dataUrl,
              signed_at: new Date().toISOString(),
              signed_by: technicianName,
              role: 'tech',
            };
            setNewSignatures(prev => [...prev, newSignature]);
            setOpenTechSignatureModal(false);
            toast({
              title: "Assinatura Adicionada",
              description: "Nova assinatura do técnico registrada.",
            });
          }}
        />

        {/* Modal de Assinatura do Cliente */}
        <SignatureModal
          open={openClientSignatureModal}
          title="Nova Assinatura do Responsável (Cliente)"
          showExtraFields
          onCancel={() => setOpenClientSignatureModal(false)}
          onSave={(dataUrl, extraFields) => {
            if (!extraFields?.name || !extraFields?.position) {
              toast({
                title: "Dados Incompletos",
                description: "Nome e cargo são obrigatórios.",
                variant: "destructive",
              });
              return;
            }
            
            const newSignature: Signature = {
              image_url: dataUrl,
              signed_at: new Date().toISOString(),
              signed_by: extraFields.name,
              position: extraFields.position,
              role: 'client',
            };
            setNewSignatures(prev => [...prev, newSignature]);
            setOpenClientSignatureModal(false);
            toast({
              title: "Assinatura Adicionada",
              description: "Nova assinatura do cliente registrada.",
            });
          }}
        />

        {/* Modais de Envio */}
        {existingCall && generatedPdfUrl && (
          <>
            <SendReportModal
              open={sendWhatsAppModalOpen}
              onOpenChange={setSendWhatsAppModalOpen}
              mode="whatsapp"
              osNumber={existingCall.os_number.toString()}
              pdfUrl={generatedPdfUrl}
              clientData={existingCall.clients!}
              companyName={systemSettings?.company_name || 'Curitiba Inox'}
              reportAccessToken={(existingCall as any).report_access_token}
            />

            <SendReportModal
              open={sendEmailModalOpen}
              onOpenChange={setSendEmailModalOpen}
              mode="email"
              osNumber={existingCall.os_number.toString()}
              pdfUrl={generatedPdfUrl}
              clientData={existingCall.clients!}
              companyName={systemSettings?.company_name || 'Curitiba Inox'}
              reportAccessToken={(existingCall as any).report_access_token}
            />
          </>
        )}

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

        {/* Modais de Deslocamento */}
        {isEditMode && existingCall && (
          <>
            <StartTripModal
              open={startTripModalOpen}
              onOpenChange={setStartTripModalOpen}
              onConfirm={handleStartTrip}
              clientAddress={existingCall.clients ? {
                street: existingCall.clients.street,
                number: existingCall.clients.number,
                neighborhood: existingCall.clients.neighborhood,
                city: existingCall.clients.city,
                state: existingCall.clients.state,
                cep: existingCall.clients.cep,
              } : undefined}
              isLoading={isCreatingTrip}
            />

            {activeTrip && activeTrip.start_odometer_km !== undefined && (
              <EndTripModal
                open={endTripModalOpen}
                onOpenChange={setEndTripModalOpen}
                onConfirm={handleEndTrip}
                startOdometer={activeTrip.start_odometer_km}
                estimatedDistanceKm={activeTrip.estimated_distance_km}
                isLoading={isUpdatingTrip}
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ServiceCallForm;
