import { MobileCard, MobileCardHeader, MobileCardRow } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type ServiceCallStatus = Tables<"service_call_statuses">;

interface StatusMobileCardProps {
  status: ServiceCallStatus;
  onEdit: () => void;
  onDelete: () => void;
}

export function StatusMobileCard({ status, onEdit, onDelete }: StatusMobileCardProps) {
  return (
    <MobileCard>
      <MobileCardHeader
        title={status.name}
        badge={<ActiveBadge active={status.active} />}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Cor:</span>
          <div 
            className="w-6 h-6 rounded-md border border-border"
            style={{ backgroundColor: status.color }}
          />
        </div>
        
        <Badge variant="outline" className="text-xs">
          {status.status_type === 'tecnico' ? 'Técnico' : 'Comercial'}
        </Badge>
        
        {status.is_default && (
          <Badge variant="secondary" className="text-xs">Padrão</Badge>
        )}
      </div>
    </MobileCard>
  );
}
