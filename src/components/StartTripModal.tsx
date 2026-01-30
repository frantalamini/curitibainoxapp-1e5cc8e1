import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVehicles } from "@/hooks/useVehicles";
import { Car, MapPin, Loader2, AlertCircle, Navigation } from "lucide-react";
import { getCurrentPosition, haversineDistance, formatDistance, type GeoCoordinates, type ClientAddress } from "@/lib/geoUtils";
import { supabase } from "@/integrations/supabase/client";

interface StartTripData {
  vehicleId: string;
  originLat: number;
  originLng: number;
  destinationLat: number | null;
  destinationLng: number | null;
  estimatedDistanceKm: number | null;
}

interface StartTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: StartTripData) => void;
  clientAddress?: ClientAddress;
  isLoading?: boolean;
}

export const StartTripModal = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  clientAddress,
  isLoading 
}: StartTripModalProps) => {
  const { vehicles } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsError, setGpsError] = useState<string>("");
  const [originCoords, setOriginCoords] = useState<GeoCoordinates | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<GeoCoordinates | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const activeVehicles = vehicles?.filter(v => v.status === 'ativo') || [];

  // Buscar GPS ao abrir o modal
  useEffect(() => {
    if (open) {
      captureGPS();
    }
  }, [open]);

  // Geocodificar endereço do cliente quando coordenadas de origem estiverem prontas
  useEffect(() => {
    if (originCoords && clientAddress && open) {
      geocodeDestination();
    }
  }, [originCoords, clientAddress, open]);

  const captureGPS = async () => {
    setGpsStatus("loading");
    setGpsError("");
    
    try {
      const coords = await getCurrentPosition();
      setOriginCoords(coords);
      setGpsStatus("success");
    } catch (error) {
      setGpsStatus("error");
      setGpsError(error instanceof Error ? error.message : "Erro ao obter localização");
    }
  };

  const geocodeDestination = async () => {
    if (!clientAddress) return;
    
    // Verifica se tem dados suficientes para geocodificar
    const hasAddress = clientAddress.street || clientAddress.city || clientAddress.cep;
    if (!hasAddress) {
      console.log("Endereço insuficiente para geocodificação");
      return;
    }
    
    setIsGeocoding(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: clientAddress,
      });
      
      if (error) throw error;
      
      if (data?.success && data.lat && data.lng) {
        const destCoords = { lat: data.lat, lng: data.lng };
        setDestinationCoords(destCoords);
        
        // Calcular distância se temos origem
        if (originCoords) {
          const distance = haversineDistance(
            originCoords.lat,
            originCoords.lng,
            destCoords.lat,
            destCoords.lng
          );
          setEstimatedDistance(distance);
        }
      }
    } catch (error) {
      console.error("Erro ao geocodificar:", error);
      // Não é crítico - continua sem coordenadas do destino
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedVehicleId || !originCoords) return;
    
    onConfirm({
      vehicleId: selectedVehicleId,
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      destinationLat: destinationCoords?.lat || null,
      destinationLng: destinationCoords?.lng || null,
      estimatedDistanceKm: estimatedDistance,
    });
    
    // Reset state
    setSelectedVehicleId("");
    setOriginCoords(null);
    setDestinationCoords(null);
    setEstimatedDistance(null);
    setGpsStatus("idle");
  };

  const handleCancel = () => {
    setSelectedVehicleId("");
    setOriginCoords(null);
    setDestinationCoords(null);
    setEstimatedDistance(null);
    setGpsStatus("idle");
    onOpenChange(false);
  };

  const canConfirm = selectedVehicleId && gpsStatus === "success" && originCoords;

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
          {/* Status GPS */}
          <div className="space-y-2">
            <Label>Localização GPS</Label>
            
            {gpsStatus === "loading" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm">Obtendo sua localização...</span>
              </div>
            )}
            
            {gpsStatus === "success" && originCoords && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">
                  Localização capturada ({originCoords.lat.toFixed(4)}, {originCoords.lng.toFixed(4)})
                </span>
              </div>
            )}
            
            {gpsStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  {gpsError}
                  <Button
                    variant="link"
                    className="ml-2 p-0 h-auto"
                    onClick={captureGPS}
                  >
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Distância estimada */}
          {estimatedDistance !== null && (
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Distância estimada</span>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatDistance(estimatedDistance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Distância em linha reta até o cliente
              </p>
            </div>
          )}
          
          {isGeocoding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Calculando distância...</span>
            </div>
          )}

          {/* Seleção de veículo */}
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
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? "Iniciando..." : "Iniciar Deslocamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
