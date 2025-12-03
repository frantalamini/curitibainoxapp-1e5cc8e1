import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { ActiveBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Palette, Tag, Star } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ServiceCallStatus = Tables<"service_call_statuses">;

interface StatusMobileCardProps {
  status: ServiceCallStatus;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StatusMobileCard({ status, onView, onEdit, onDelete }: StatusMobileCardProps) {
  return (
    <MobileCard onClick={onEdit}>
      <MobileCardHeader
        title={status.name}
        badge={<ActiveBadge active={status.active} />}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Palette className="h-4 w-4" />}
          label="Cor"
          value={
            <div className="flex items-center gap-2">
              <div 
                className="w-5 h-5 rounded-md border border-border"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-muted-foreground text-xs">{status.color}</span>
            </div>
          }
        />
        
        <MobileCardRow
          icon={<Tag className="h-4 w-4" />}
          label="Tipo"
          value={status.status_type === 'tecnico' ? 'Técnico' : 'Comercial'}
        />
      </div>
      
      <MobileCardFooter
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        {status.is_default && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Star className="h-3 w-3" />
            Padrão
          </Badge>
        )}
      </MobileCardFooter>
    </MobileCard>
  );
}
