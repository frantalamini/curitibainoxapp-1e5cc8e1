import { MobileCard, MobileCardHeader } from "@/components/ui/mobile-card";
import { ActiveBadge, StatusBadge } from "@/components/ui/status-badge";
import type { Tables } from "@/integrations/supabase/types";

type ServiceType = Tables<"service_types">;

interface ServiceTypeMobileCardProps {
  serviceType: ServiceType;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceTypeMobileCard({ serviceType, onEdit, onDelete }: ServiceTypeMobileCardProps) {
  return (
    <MobileCard>
      <MobileCardHeader
        title={serviceType.name}
        badge={<ActiveBadge active={serviceType.active} />}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm text-muted-foreground">Cor:</span>
        <div 
          className="w-6 h-6 rounded-md border border-border"
          style={{ backgroundColor: serviceType.color }}
        />
        <span className="text-sm text-muted-foreground">{serviceType.color}</span>
      </div>
    </MobileCard>
  );
}
