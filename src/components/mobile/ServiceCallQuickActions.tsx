import { Button } from "@/components/ui/button";
import { Eye, Car, MapPin } from "lucide-react";

interface ServiceCallQuickActionsProps {
  onOpenOS: () => void;
  onStartTrip?: () => void;
  onEndTrip?: () => void;
  hasOpenTrip: boolean;
  canStartTrip: boolean;
  showTripActions?: boolean;
}

export function ServiceCallQuickActions({
  onOpenOS,
  onStartTrip,
  onEndTrip,
  hasOpenTrip,
  canStartTrip,
  showTripActions = true,
}: ServiceCallQuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-1.5"
        onClick={(e) => {
          e.stopPropagation();
          onOpenOS();
        }}
      >
        <Eye className="h-4 w-4" />
        <span className="hidden xs:inline">Abrir OS</span>
      </Button>

      {showTripActions && (
        <>
          {hasOpenTrip ? (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={(e) => {
                e.stopPropagation();
                onEndTrip?.();
              }}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden xs:inline">Cheguei</span>
            </Button>
          ) : canStartTrip ? (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onStartTrip?.();
              }}
            >
              <Car className="h-4 w-4" />
              <span className="hidden xs:inline">Iniciar</span>
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
