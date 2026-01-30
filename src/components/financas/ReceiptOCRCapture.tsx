import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Scan, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OCRResult {
  amount: number | null;
  description: string | null;
  date: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

interface ReceiptOCRCaptureProps {
  onExtracted: (data: OCRResult) => void;
  onPhotoChange?: (photoUrl: string | null) => void;
  disabled?: boolean;
}

export function ReceiptOCRCapture({ onExtracted, onPhotoChange, disabled }: ReceiptOCRCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      onPhotoChange?.(base64);
      
      // Extract data via OCR
      await extractFromPhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const extractFromPhoto = async (base64: string) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-receipt-amount", {
        body: { imageBase64: base64 }
      });

      if (error) {
        console.error("OCR error:", error);
        toast.error("Não foi possível ler os dados automaticamente");
        setIsExtracting(false);
        return;
      }

      if (data?.success && data?.data) {
        const result: OCRResult = {
          amount: data.data.amount,
          description: data.data.description,
          date: data.data.date,
          confidence: data.data.confidence || "medium",
          notes: data.data.notes,
        };
        
        onExtracted(result);
        
        if (result.amount) {
          toast.success(`Valor detectado: R$ ${result.amount.toFixed(2).replace(".", ",")}`, {
            description: result.confidence === "high" 
              ? "Alta confiança" 
              : result.confidence === "medium" 
                ? "Confiança média - verifique os dados" 
                : "Baixa confiança - revise com atenção"
          });
        } else {
          toast.info("Não foi possível detectar o valor. Preencha manualmente.");
        }
      } else {
        toast.info("Não foi possível extrair dados. Preencha manualmente.");
      }
    } catch (error) {
      console.error("OCR extraction error:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsExtracting(false);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    onPhotoChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {photoPreview ? (
        <div className="relative">
          <img
            src={photoPreview}
            alt="Comprovante"
            className="w-full max-h-48 object-contain rounded-md border bg-muted"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={clearPhoto}
            disabled={isExtracting}
          >
            <X className="h-4 w-4" />
          </Button>
          {isExtracting && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Scan className="h-5 w-5 animate-pulse text-primary" />
                Lendo dados...
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCameraClick}
            disabled={disabled || isExtracting}
          >
            <Camera className="h-4 w-4 mr-2" />
            Tirar Foto
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleGalleryClick}
            disabled={disabled || isExtracting}
          >
            <Upload className="h-4 w-4 mr-2" />
            Galeria
          </Button>
        </div>
      )}

      {isExtracting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando imagem com IA...
        </div>
      )}
    </div>
  );
}
