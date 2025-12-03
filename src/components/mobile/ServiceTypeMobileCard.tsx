import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { Palette } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ServiceType = Tables<"service_types">;

interface ServiceTypeMobileCardProps {
  serviceType: ServiceType;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceTypeMobileCard({ serviceType, onView, onEdit, onDelete }: ServiceTypeMobileCardProps) {
  return (
    <MobileCard onClick={onEdit}>
      <MobileCardHeader
        title={serviceType.name}
        badge={<ActiveBadge active={serviceType.active} />}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Palette className="h-4 w-4" />}
          label="Cor"
          value={
            <div className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded-md border border-border"
                style={{ backgroundColor: serviceType.color }}
              />
              <span className="text-muted-foreground text-xs">{serviceType.color}</span>
            </div>
          }
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
