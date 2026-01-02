import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Route, Car, User, MapPin } from "lucide-react";

interface TripData {
  id: string;
  started_at: string;
  status: string;
  start_odometer_km: number;
  end_odometer_km: number | null;
  distance_km: number | null;
  service_call_id: string;
  technicians?: { full_name: string } | null;
  vehicles?: { name: string; plate: string; brand: string | null } | null;
  service_calls?: { 
    os_number: number; 
    clients?: { full_name: string } | null 
  } | null;
}

interface TripMobileCardProps {
  trip: TripData;
  onViewServiceCall: (serviceCallId: string) => void;
}

export function TripMobileCard({ trip, onViewServiceCall }: TripMobileCardProps) {
  const getStatusBadge = (status: string) => {
    if (status === "concluido") {
      return <Badge className="bg-green-500">Concluído</Badge>;
    }
    return <Badge className="bg-yellow-500">Em deslocamento</Badge>;
  };

  return (
    <Card className="w-full max-w-full min-w-0">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Route className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {format(new Date(trip.started_at), "dd/MM/yyyy HH:mm")}
              </p>
              <p className="text-xs text-muted-foreground">
                OS #{trip.service_calls?.os_number}
              </p>
            </div>
          </div>
          {getStatusBadge(trip.status)}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          {trip.technicians && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{trip.technicians.full_name}</span>
            </div>
          )}
          
          {trip.vehicles && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {trip.vehicles.name} - {trip.vehicles.plate}
                {trip.vehicles.brand && ` • ${trip.vehicles.brand}`}
              </span>
            </div>
          )}

          {trip.service_calls?.clients && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{trip.service_calls.clients.full_name}</span>
            </div>
          )}
        </div>

        {/* Odometer Info */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm bg-muted/50 rounded-lg p-2">
          <div>
            <p className="text-xs text-muted-foreground">Km Início</p>
            <p className="font-medium">
              {trip.start_odometer_km.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Km Fim</p>
            <p className="font-medium">
              {trip.end_odometer_km 
                ? trip.end_odometer_km.toLocaleString("pt-BR", { minimumFractionDigits: 1 })
                : "-"
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Distância</p>
            <p className="font-medium text-primary">
              {trip.distance_km 
                ? `${trip.distance_km.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} km`
                : "-"
              }
            </p>
          </div>
        </div>

        {/* Action */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onViewServiceCall(trip.service_call_id)}
        >
          Ver Ordem de Serviço
        </Button>
      </CardContent>
    </Card>
  );
}
