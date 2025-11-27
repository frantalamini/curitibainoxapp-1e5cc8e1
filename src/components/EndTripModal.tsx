import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface EndTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (endOdometer: number) => void;
  startOdometer: number;
  isLoading?: boolean;
}

export const EndTripModal = ({ open, onOpenChange, onConfirm, startOdometer, isLoading }: EndTripModalProps) => {
  const [endOdometer, setEndOdometer] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleConfirm = () => {
    setError("");

    if (!endOdometer) {
      setError("Informe a quilometragem final");
      return;
    }
    
    const odometerValue = parseFloat(endOdometer);
    
    if (isNaN(odometerValue) || odometerValue < 0) {
      setError("Quilometragem inválida");
      return;
    }

    if (odometerValue < startOdometer) {
      setError(`A quilometragem final deve ser maior ou igual a ${startOdometer} km`);
      return;
    }

    onConfirm(odometerValue);
    
    // Reset form
    setEndOdometer("");
    setError("");
  };

  const handleCancel = () => {
    setEndOdometer("");
    setError("");
    onOpenChange(false);
  };

  const calculatedDistance = endOdometer && !isNaN(parseFloat(endOdometer))
    ? Math.max(0, parseFloat(endOdometer) - startOdometer).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Cheguei no Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quilometragem Inicial</Label>
            <Input
              type="text"
              value={`${startOdometer} km`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-odometer">Quilometragem Final (km) *</Label>
            <Input
              id="end-odometer"
              type="number"
              step="0.1"
              min={startOdometer}
              value={endOdometer}
              onChange={(e) => setEndOdometer(e.target.value)}
              placeholder="Ex: 15360.8"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {calculatedDistance && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Distância percorrida</p>
              <p className="text-2xl font-bold text-primary">{calculatedDistance} km</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!endOdometer || isLoading}
          >
            {isLoading ? "Finalizando..." : "Finalizar Deslocamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
