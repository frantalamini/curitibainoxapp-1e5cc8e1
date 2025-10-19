import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const clear = () => {
    sigPadRef.current?.clear();
    setIsSaved(false);
  };

  const save = () => {
    if (sigPadRef.current?.isEmpty()) {
      alert("Por favor, assine antes de salvar.");
      return;
    }

    const dataURL = sigPadRef.current?.toDataURL("image/png");
    
    if (showExtraFields) {
      if (!customerName || !customerPosition) {
        alert("Por favor, preencha nome e cargo.");
        return;
      }
      onSave(dataURL, { name: customerName, position: customerPosition });
    } else {
      onSave(dataURL);
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
          <div className="grid grid-cols-2 gap-4">
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
        
        <div className="border-2 border-muted rounded-lg bg-background">
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              className: "w-full h-48 rounded-lg",
            }}
            backgroundColor="white"
          />
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
