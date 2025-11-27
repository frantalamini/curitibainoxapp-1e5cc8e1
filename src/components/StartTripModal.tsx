import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicles } from "@/hooks/useVehicles";
import { Car } from "lucide-react";

interface StartTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (vehicleId: string, startOdometer: number) => void;
  isLoading?: boolean;
}

export const StartTripModal = ({ open, onOpenChange, onConfirm, isLoading }: StartTripModalProps) => {
  const { vehicles } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [startOdometer, setStartOdometer] = useState<string>("");

  const activeVehicles = vehicles?.filter(v => v.status === 'ativo') || [];
  const selectedVehicle = activeVehicles.find(v => v.id === selectedVehicleId);

  // Preencher automaticamente a quilometragem quando selecionar um veículo
  useEffect(() => {
    if (selectedVehicle?.current_odometer_km) {
      setStartOdometer(selectedVehicle.current_odometer_km.toString());
    }
  }, [selectedVehicle]);

  const handleConfirm = () => {
    if (!selectedVehicleId || !startOdometer) return;
    
    const odometerValue = parseFloat(startOdometer);
    if (isNaN(odometerValue) || odometerValue < 0) {
      return;
    }

    onConfirm(selectedVehicleId, odometerValue);
    
    // Reset form
    setSelectedVehicleId("");
    setStartOdometer("");
  };

  const handleCancel = () => {
    setSelectedVehicleId("");
    setStartOdometer("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Iniciar Deslocamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Veículo *</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {activeVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.plate}
                    {vehicle.brand && ` (${vehicle.brand})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="odometer">Quilometragem Atual (km) *</Label>
            <Input
              id="odometer"
              type="number"
              step="0.1"
              min="0"
              value={startOdometer}
              onChange={(e) => setStartOdometer(e.target.value)}
              placeholder="Ex: 15320.5"
            />
            {selectedVehicle?.current_odometer_km && (
              <p className="text-sm text-muted-foreground">
                Última quilometragem registrada: {selectedVehicle.current_odometer_km} km
              </p>
            )}
          </div>
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
            disabled={!selectedVehicleId || !startOdometer || isLoading}
          >
            {isLoading ? "Iniciando..." : "Iniciar Deslocamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
