import { useRef, useState } from "react";
import { Plus, X, Image, Video, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface MediaSlotsProps {
  mode: 'before' | 'after';
  maxPhotos?: number;
  maxVideos?: number;
  photoFiles: File[];
  videoFile: File | null;
  existingPhotoUrls: string[];
  existingVideoUrl: string | null;
  onPhotoFilesChange: (files: File[]) => void;
  onVideoFileChange: (file: File | null) => void;
  onExistingPhotoUrlsChange: (urls: string[]) => void;
  onExistingVideoUrlChange: (url: string | null) => void;
  disabled?: boolean;
}

export const MediaSlots = ({
  mode,
  maxPhotos = 5,
  maxVideos = 1,
  photoFiles,
  videoFile,
  existingPhotoUrls,
  existingVideoUrl,
  onPhotoFilesChange,
  onVideoFileChange,
  onExistingPhotoUrlsChange,
  onExistingVideoUrlChange,
  disabled = false,
}: MediaSlotsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');

  // Calcular estado atual
  const totalPhotos = photoFiles.length + existingPhotoUrls.length;
  const hasVideo = !!videoFile || !!existingVideoUrl;
  const hasPhotos = totalPhotos > 0;
  
  // Regra de exclusão mútua
  const canAddPhotos = !hasVideo && totalPhotos < maxPhotos;
  const canAddVideo = !hasPhotos && !hasVideo;

  // Labels
  const modeLabel = mode === 'before' ? 'Antes da Manutenção' : 'Depois da Manutenção';

  // Handler para seleção de arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const images = files.filter(f => f.type.startsWith('image/'));
    const videos = files.filter(f => f.type.startsWith('video/'));

    // Se tem vídeo e pode adicionar vídeo
    if (videos.length > 0 && canAddVideo) {
      onVideoFileChange(videos[0]);
    }
    // Se tem fotos e pode adicionar fotos
    else if (images.length > 0 && canAddPhotos) {
      const slotsAvailable = maxPhotos - totalPhotos;
      const newImages = images.slice(0, slotsAvailable);
      onPhotoFilesChange([...photoFiles, ...newImages]);
    }

    // Reset input
    e.target.value = '';
  };

  // Remover foto nova
  const removePhotoFile = (index: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== index);
    onPhotoFilesChange(newFiles);
  };

  // Remover foto existente
  const removeExistingPhoto = (url: string) => {
    onExistingPhotoUrlsChange(existingPhotoUrls.filter(u => u !== url));
  };

  // Remover vídeo
  const removeVideo = () => {
    onVideoFileChange(null);
    onExistingVideoUrlChange(null);
  };

  // Preview de mídia
  const openPreview = (url: string, type: 'image' | 'video') => {
    setPreviewUrl(url);
    setPreviewType(type);
  };

  // Criar URLs temporárias para arquivos novos
  const getFilePreviewUrl = (file: File) => URL.createObjectURL(file);

  // Renderizar slot vazio
  const renderEmptySlot = (index: number, isVideoSlot: boolean = false) => {
    const isDisabled = disabled || (isVideoSlot ? !canAddVideo : !canAddPhotos);
    
    return (
      <button
        key={`empty-${index}`}
        type="button"
        onClick={() => !isDisabled && fileInputRef.current?.click()}
        disabled={isDisabled}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors",
          "w-full aspect-square",
          isDisabled 
            ? "border-muted bg-muted/20 cursor-not-allowed opacity-50" 
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5 cursor-pointer"
        )}
      >
        <Plus className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Adicionar</span>
      </button>
    );
  };

  // Renderizar slot com foto
  const renderPhotoSlot = (url: string, onRemove: () => void, isExisting: boolean = false) => (
    <div 
      key={url} 
      className={cn(
        "relative rounded-lg overflow-hidden border-2 w-full aspect-square",
        isExisting ? "border-green-500" : "border-border"
      )}
    >
      <img
        src={url}
        alt="Foto"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 hover:opacity-100">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          onClick={() => openPreview(url, 'image')}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isExisting && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] text-center py-0.5">
          Salva
        </div>
      )}
    </div>
  );

  // Renderizar slot com vídeo
  const renderVideoSlot = (url: string, onRemove: () => void, isExisting: boolean = false) => (
    <div 
      key={url}
      className={cn(
        "relative rounded-lg overflow-hidden border-2 w-full aspect-square col-span-2 row-span-2",
        isExisting ? "border-green-500" : "border-border"
      )}
    >
      <video
        src={url}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <Video className="h-8 w-8 text-white" />
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          onClick={() => openPreview(url, 'video')}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {isExisting && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] text-center py-0.5">
          Salvo
        </div>
      )}
    </div>
  );

  // Calcular slots
  const renderSlots = () => {
    const slots: React.ReactNode[] = [];

    // Se tem vídeo, mostrar apenas ele
    if (hasVideo) {
      const videoUrl = existingVideoUrl || (videoFile ? getFilePreviewUrl(videoFile) : null);
      if (videoUrl) {
        slots.push(renderVideoSlot(videoUrl, removeVideo, !!existingVideoUrl));
      }
    } else {
      // Mostrar fotos existentes
      existingPhotoUrls.forEach((url) => {
        slots.push(renderPhotoSlot(url, () => removeExistingPhoto(url), true));
      });

      // Mostrar fotos novas
      photoFiles.forEach((file, index) => {
        const url = getFilePreviewUrl(file);
        slots.push(renderPhotoSlot(url, () => removePhotoFile(index), false));
      });

      // Preencher slots vazios
      const emptySlots = maxPhotos - totalPhotos;
      for (let i = 0; i < emptySlots; i++) {
        slots.push(renderEmptySlot(i));
      }
    }

    return slots;
  };

  // Contador
  const getCounter = () => {
    if (hasVideo) {
      return "Vídeo adicionado (1/1)";
    }
    return `${totalPhotos}/${maxPhotos} fotos`;
  };

  // Mensagem de aviso
  const getWarning = () => {
    if (hasVideo && !canAddPhotos) {
      return "Para usar fotos, remova o vídeo.";
    }
    if (hasPhotos && !canAddVideo) {
      return "Para usar vídeo, remova as fotos.";
    }
    return null;
  };

  const warning = getWarning();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {mode === 'before' ? <Image className="h-4 w-4" /> : <Image className="h-4 w-4" />}
          Mídia ({modeLabel})
        </Label>
        <span className="text-xs text-muted-foreground">{getCounter()}</span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Adicione até 5 fotos OU 1 vídeo. {warning && <span className="text-amber-600 font-medium">{warning}</span>}
      </p>

      {/* Grid de slots - responsivo */}
      <div className={cn(
        "grid gap-2",
        hasVideo ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-5"
      )}>
        {renderSlots()}
      </div>

      {/* Input oculto para seleção de arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept={hasPhotos ? "image/*" : hasVideo ? "" : "image/*,video/*"}
        capture="environment"
        multiple={!hasVideo && canAddPhotos}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Botão de ação quando não há mídia */}
      {!hasVideo && totalPhotos === 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Image className="h-4 w-4 mr-2" />
            Adicionar Fotos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Forçar seleção de vídeo
              if (fileInputRef.current) {
                fileInputRef.current.accept = "video/*";
                fileInputRef.current.multiple = false;
                fileInputRef.current.click();
                // Restaurar para próximo uso
                setTimeout(() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*,video/*";
                  }
                }, 100);
              }
            }}
            disabled={disabled}
          >
            <Video className="h-4 w-4 mr-2" />
            Adicionar Vídeo
          </Button>
        </div>
      )}

      {/* Modal de preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Visualização de mídia</DialogTitle>
          {previewUrl && previewType === 'image' && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[80vh] object-contain" />
          )}
          {previewUrl && previewType === 'video' && (
            <video src={previewUrl} controls className="w-full h-auto max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
