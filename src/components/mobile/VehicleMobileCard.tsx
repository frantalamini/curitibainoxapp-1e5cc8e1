import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { Car, FileText, Gauge, CreditCard } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Vehicle = Tables<"vehicles">;

interface VehicleMobileCardProps {
  vehicle: Vehicle;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function VehicleMobileCard({ vehicle, onView, onEdit, onDelete }: VehicleMobileCardProps) {
  const formatOdometer = (km: number | null) => {
    if (!km) return "-";
    return km.toLocaleString('pt-BR') + ' km';
  };

  const getStatusBadge = () => {
    switch (vehicle.status) {
      case 'ativo':
        return <ActiveBadge active={true} activeLabel="Ativo" />;
      case 'inativo':
        return <ActiveBadge active={false} inactiveLabel="Inativo" />;
      case 'em_manutencao':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            Em Manutenção
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <MobileCard onClick={onEdit}>
      <MobileCardHeader
        title={vehicle.name}
        subtitle={vehicle.plate}
        badge={getStatusBadge()}
      />
      
      <div className="space-y-1">
        {vehicle.brand && (
          <MobileCardRow
            icon={<Car className="h-4 w-4" />}
            label="Marca"
            value={vehicle.brand}
          />
        )}
        
        {vehicle.renavam && (
          <MobileCardRow
            icon={<CreditCard className="h-4 w-4" />}
            label="RENAVAM"
            value={vehicle.renavam}
          />
        )}
        
        <MobileCardRow
          icon={<Gauge className="h-4 w-4" />}
          label="Odômetro"
          value={formatOdometer(vehicle.current_odometer_km)}
        />
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </MobileCard>
  );
}
