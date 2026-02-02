import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardFooter } from "@/components/ui/mobile-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ServiceCall } from "@/hooks/useServiceCalls";
import { parseLocalDate } from "@/lib/dateUtils";
import { ServiceCallActionsMenu } from "@/components/service-calls/ServiceCallActionsMenu";
import { ServiceCallMarkersList } from "@/components/service-calls/ServiceCallMarkersList";
import type { ServiceCallMarker } from "@/hooks/useServiceCallMarkers";

interface ServiceCallMobileCardProps {
  call: ServiceCall;
  onClick: () => void;
  markers?: ServiceCallMarker[];
  onAddMarker?: (serviceCallId: string, text: string) => Promise<void>;
  onRemoveMarker?: (markerId: string) => Promise<void>;
  isLoadingMarkers?: boolean;
}

export function ServiceCallMobileCard({ 
  call, 
  onClick, 
  markers = [],
  onAddMarker,
  onRemoveMarker,
  isLoadingMarkers,
}: ServiceCallMobileCardProps) {
  return (
    <MobileCard onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-foreground">OS #{call.os_number}</h3>
            {call.service_call_statuses && (
              <StatusBadge 
                color={call.service_call_statuses.color} 
                label={call.service_call_statuses.name} 
              />
            )}
          </div>
        </div>
        {onAddMarker && onRemoveMarker && (
          <div onClick={(e) => e.stopPropagation()}>
            <ServiceCallActionsMenu
              serviceCallId={call.id}
              osNumber={call.os_number}
              clientName={call.clients?.full_name}
              markers={markers}
              onAddMarker={onAddMarker}
              onRemoveMarker={onRemoveMarker}
              isLoading={isLoadingMarkers}
              currentStatusId={call.status_id}
              currentCommercialStatusId={call.commercial_status_id}
            />
          </div>
        )}
      </div>
      
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
              {call.clients?.secondary_name && (
                <span className="text-xs text-blue-600 font-medium">{call.clients.secondary_name}</span>
              )}
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

      {/* Marcadores */}
      {markers.length > 0 && (
        <div className="mt-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          <ServiceCallMarkersList markers={markers} maxVisible={3} />
        </div>
      )}
      
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
