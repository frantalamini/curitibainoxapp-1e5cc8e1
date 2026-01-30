import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistance } from "@/lib/geoUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EndTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (endOdometer: number | null) => void;
  startOdometer: number;
  estimatedDistanceKm?: number | null;
  isLoading?: boolean;
}

export const EndTripModal = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  startOdometer, 
  estimatedDistanceKm,
  isLoading 
}: EndTripModalProps) => {
  const [endOdometer, setEndOdometer] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleConfirm = () => {
    setError("");

    // Se não preencheu manualmente, usa distância GPS ou null
    if (!endOdometer) {
      onConfirm(null);
      resetState();
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
    resetState();
  };

  const resetState = () => {
    setEndOdometer("");
    setError("");
    setShowManualEntry(false);
  };

  const handleCancel = () => {
    resetState();
    onOpenChange(false);
  };

  const calculatedDistance = endOdometer && !isNaN(parseFloat(endOdometer))
    ? Math.max(0, parseFloat(endOdometer) - startOdometer)
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
          {/* Distância GPS calculada automaticamente */}
          {estimatedDistanceKm !== null && estimatedDistanceKm !== undefined && (
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Distância calculada (GPS)</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {formatDistance(estimatedDistanceKm)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Calculado automaticamente via GPS
              </p>
            </div>
          )}

          {/* Entrada manual opcional */}
          <Collapsible open={showManualEntry} onOpenChange={setShowManualEntry}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between text-muted-foreground"
                type="button"
              >
                <span className="text-sm">
                  {showManualEntry ? "Ocultar entrada manual" : "Informar quilometragem manual (opcional)"}
                </span>
                {showManualEntry ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Quilometragem Inicial</Label>
                <Input
                  type="text"
                  value={`${startOdometer.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-odometer">Quilometragem Final (km)</Label>
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

              {calculatedDistance !== null && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Distância manual</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatDistance(calculatedDistance)}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
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
            disabled={isLoading}
          >
            {isLoading ? "Finalizando..." : "Confirmar Chegada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
