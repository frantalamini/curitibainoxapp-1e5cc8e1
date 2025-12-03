import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, User, Wrench, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ServiceCall } from "@/hooks/useServiceCalls";

interface ServiceCallMobileCardProps {
  call: ServiceCall;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceCallMobileCard({ call, onView, onEdit, onDelete }: ServiceCallMobileCardProps) {
  return (
    <MobileCard>
      <MobileCardHeader
        title={`OS #${call.os_number}`}
        subtitle={format(new Date(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR }) + " às " + call.scheduled_time}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<User className="h-4 w-4" />}
          value={
            <div className="flex flex-col">
              <span className="font-medium">{call.clients?.full_name}</span>
              {call.clients?.phone && (
                <span className="text-xs text-muted-foreground">{call.clients.phone}</span>
              )}
            </div>
          }
        />
        
        <MobileCardRow
          icon={<Wrench className="h-4 w-4" />}
          value={call.equipment_description}
        />
        
        {call.technicians && (
          <MobileCardRow
            icon={<span className="text-xs">👷</span>}
            label="Técnico"
            value={call.technicians.full_name}
          />
        )}
      </div>
      
      <MobileCardFooter>
        {call.service_types && (
          <StatusBadge 
            color={call.service_types.color} 
            label={call.service_types.name} 
          />
        )}
        {call.service_call_statuses && (
          <StatusBadge 
            color={call.service_call_statuses.color} 
            label={call.service_call_statuses.name} 
          />
        )}
        {call.commercial_status && (
          <StatusBadge 
            color={call.commercial_status.color} 
            label={call.commercial_status.name} 
          />
        )}
      </MobileCardFooter>
    </MobileCard>
  );
}
