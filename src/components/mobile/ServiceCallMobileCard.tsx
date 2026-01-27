import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ServiceCall } from "@/hooks/useServiceCalls";
import { parseLocalDate } from "@/lib/dateUtils";

interface ServiceCallMobileCardProps {
  call: ServiceCall;
  onClick: () => void;
}

export function ServiceCallMobileCard({ call, onClick }: ServiceCallMobileCardProps) {
  return (
    <MobileCard onClick={onClick}>
      <MobileCardHeader
        title={`OS #${call.os_number}`}
        badge={call.service_call_statuses && (
          <StatusBadge 
            color={call.service_call_statuses.color} 
            label={call.service_call_statuses.name} 
          />
        )}
      />
      
      <div className="space-y-1">
        <MobileCardRow
          icon={<Calendar className="h-4 w-4" />}
          label="Data/Hora"
          value={`${format(parseLocalDate(call.scheduled_date), "dd/MM/yyyy", { locale: ptBR })} às ${call.scheduled_time}`}
        />
        
        <MobileCardRow
          icon={<User className="h-4 w-4" />}
          label="Cliente"
          value={
            <div className="flex flex-col">
              <span className="font-medium">{call.clients?.full_name}</span>
              {call.clients?.phone && (
                <span className="text-xs text-muted-foreground">{call.clients.phone}</span>
              )}
            </div>
          }
        />
        
        {call.technicians && (
          <MobileCardRow
            icon={<Clock className="h-4 w-4" />}
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
