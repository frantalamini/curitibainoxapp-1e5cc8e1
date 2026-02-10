import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Scan, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTechnicianReimbursements, CreateReimbursementInput } from "@/hooks/useTechnicianReimbursements";

interface ReimbursementRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceCallId: string;
  technicianId: string;
}

export function ReimbursementRequestModal({
  open,
  onOpenChange,
  serviceCallId,
  technicianId,
}: ReimbursementRequestModalProps) {
  const { createReimbursement } = useTechnicianReimbursements();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [ocrAmount, setOcrAmount] = useState<number | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Auto-extract when photo is selected
      extractAmountFromPhoto(file);
    }
  };

  const extractAmountFromPhoto = async (file: File) => {
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("extract-receipt-amount", {
          body: { imageBase64: base64 }
        });

        if (error) {
          console.error("OCR error:", error);
          toast.error("Não foi possível ler o valor automaticamente");
          return;
        }

        if (data?.success && data?.data?.amount) {
          setOcrAmount(data.data.amount);
          setAmount(data.data.amount.toFixed(2).replace(".", ","));
          if (data.data.description && !description) {
            setDescription(data.data.description);
          }
          toast.success(`Valor detectado: R$ ${data.data.amount.toFixed(2).replace(".", ",")}`);
        } else {
          toast.info("Não foi possível detectar o valor. Digite manualmente.");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("OCR extraction error:", error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsExtracting(false);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setOcrAmount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!photoFile || !amount) {
      toast.error("Foto e valor são obrigatórios");
      return;
    }

    const numericAmount = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photo to storage
      const fileName = `reimbursements/${serviceCallId}/${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("service-call-attachments")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Bucket é privado - usar signed URL
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from("service-call-attachments")
        .createSignedUrl(fileName, 604800); // 7 dias

      if (signedUrlError || !urlData) throw signedUrlError;

      const input: CreateReimbursementInput = {
        service_call_id: serviceCallId,
        technician_id: technicianId,
        receipt_photo_url: urlData.signedUrl,
        description: description || undefined,
        amount: numericAmount,
        ocr_extracted_amount: ocrAmount || undefined,
      };

      await createReimbursement.mutateAsync(input);
      
      // Reset form
      setPhotoFile(null);
      setPhotoPreview(null);
      setDescription("");
      setAmount("");
      setOcrAmount(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Erro ao enviar solicitação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Reembolso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Photo Upload */}
          <div>
            <Label>Foto do Comprovante *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {photoPreview ? (
              <div className="relative mt-2">
                <img
                  src={photoPreview}
                  alt="Comprovante"
                  className="w-full max-h-48 object-contain rounded-md border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearPhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
                {isExtracting && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Scan className="h-4 w-4 animate-pulse" />
                      Lendo valor...
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                      fileInputRef.current.setAttribute("capture", "environment");
                    }
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Galeria
                </Button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label>
              Valor (R$) *
              {ocrAmount && (
                <span className="text-xs text-muted-foreground ml-2">
                  (detectado automaticamente)
                </span>
              )}
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (!raw) { setAmount(""); return; }
                const cents = parseInt(raw, 10);
                const formatted = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                setAmount(formatted);
              }}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              placeholder="Ex: Compra de peça de reposição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !photoFile || !amount}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Solicitação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
