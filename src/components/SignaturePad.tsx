import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface SignaturePadProps {
  title: string;
  onSave: (signatureData: string, extraData?: { name?: string; position?: string }) => void;
  showExtraFields?: boolean;
}

export const SignaturePad = ({ title, onSave, showExtraFields = false }: SignaturePadProps) => {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPosition, setCustomerPosition] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Traço mais grosso em dispositivos touch para melhor visibilidade
  const strokeConfig = {
    minWidth: isMobile ? 2 : 1.5,
    maxWidth: isMobile ? 4.5 : 3.5,
  };

  const clear = () => {
    sigPadRef.current?.clear();
    setIsSaved(false);
    toast({
      title: "Assinatura Limpa",
      description: "Você pode fazer uma nova assinatura.",
    });
  };

  const save = () => {
    if (sigPadRef.current?.isEmpty()) {
      toast({
        title: "Atenção",
        description: "Por favor, assine antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    const dataURL = sigPadRef.current?.toDataURL("image/png");
    
    if (showExtraFields) {
      if (!customerName || !customerPosition) {
        toast({
          title: "Campos Obrigatórios",
          description: "Por favor, preencha nome e cargo antes de salvar.",
          variant: "destructive"
        });
        return;
      }
      onSave(dataURL, { name: customerName, position: customerPosition });
      toast({
        title: "✅ Assinatura Salva",
        description: "Assinatura do responsável salva com sucesso!",
      });
    } else {
      onSave(dataURL);
      toast({
        title: "✅ Assinatura Salva",
        description: "Assinatura do técnico salva com sucesso!",
      });
    }
    
    setIsSaved(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showExtraFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Responsável *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Input
                value={customerPosition}
                onChange={(e) => setCustomerPosition(e.target.value)}
                placeholder="Ex: Gerente"
              />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isMobile ? "Use o dedo para assinar na área abaixo" : "Use o mouse para assinar na área abaixo"}
          </p>
          
          <div className="border-2 border-muted rounded-lg bg-background overflow-hidden">
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                className: "w-full h-48 sm:h-56 rounded-lg",
                style: { 
                  touchAction: "none",
                  cursor: "crosshair"
                }
              }}
              backgroundColor="white"
              penColor="black"
              minWidth={strokeConfig.minWidth}
              maxWidth={strokeConfig.maxWidth}
              velocityFilterWeight={0.7}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={clear}>
            Limpar
          </Button>
          <Button type="button" onClick={save}>
            {isSaved ? "✓ Assinatura Salva" : "Salvar Assinatura"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
