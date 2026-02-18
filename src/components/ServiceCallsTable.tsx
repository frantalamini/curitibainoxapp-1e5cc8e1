import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import type { ServiceCall } from "@/hooks/useServiceCalls";
import { useServiceCallMarkers } from "@/hooks/useServiceCallMarkers";
import { ServiceCallActionsMenu } from "@/components/service-calls/ServiceCallActionsMenu";
import { ServiceCallMarkersList } from "@/components/service-calls/ServiceCallMarkersList";
import { useMemo } from "react";

type ServiceCallsTableProps = {
  calls: ServiceCall[];
  onRowClick: (id: string) => void;
};

export const ServiceCallsTable = ({
  calls,
  onRowClick,
}: ServiceCallsTableProps) => {
  const serviceCallIds = useMemo(() => calls.map(c => c.id), [calls]);
  const { markersByServiceCall, isLoading: markersLoading, addMarker, removeMarker } = useServiceCallMarkers(serviceCallIds);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "-";
    try {
      return format(parseLocalDate(dateStr), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick(id);
    }
  };

  const handleAddMarker = async (serviceCallId: string, text: string) => {
    await addMarker.mutateAsync({ serviceCallId, text });
  };

  const handleRemoveMarker = async (markerId: string) => {
    await removeMarker.mutateAsync(markerId);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[60px]">Nº OS</TableHead>
            <TableHead className="w-8 px-1"></TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="w-[10%]">Equip.</TableHead>
            <TableHead className="w-[10%]">Data</TableHead>
            <TableHead className="w-[10%]">Técnico</TableHead>
            <TableHead className="w-[12%]">
              <span className="block">Status</span>
              <span className="block">Técnico</span>
            </TableHead>
            <TableHead className="w-[12%]">
              <span className="block">Status</span>
              <span className="block">Comercial</span>
            </TableHead>
            <TableHead className="w-[140px]">Marcadores</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => {
            const callMarkers = markersByServiceCall[call.id] || [];
            return (
              <TableRow
                key={call.id}
                tabIndex={0}
                className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => onRowClick(call.id)}
                onKeyDown={(e) => handleKeyDown(e, call.id)}
              >
                <TableCell className="py-2">
                  <span className="text-sm font-mono font-semibold text-primary">
                    #{call.os_number}
                  </span>
                </TableCell>
                <TableCell className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                  <ServiceCallActionsMenu
                    serviceCallId={call.id}
                    osNumber={call.os_number}
                    clientName={call.clients?.full_name}
                    markers={callMarkers}
                    onAddMarker={handleAddMarker}
                    onRemoveMarker={handleRemoveMarker}
                    isLoading={markersLoading}
                    currentStatusId={call.status_id}
                    currentCommercialStatusId={call.commercial_status_id}
                  />
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-col max-w-[200px]">
                    <span className="font-medium text-sm truncate" title={call.clients?.full_name}>
                      {call.clients?.full_name || "-"}
                    </span>
                    {call.clients?.nome_fantasia && (
                      <span className="text-xs text-muted-foreground truncate" title={call.clients.nome_fantasia}>
                        {call.clients.nome_fantasia}
                      </span>
                    )}
                    {call.clients?.secondary_name && (
                      <span className="text-xs text-blue-600 truncate" title={call.clients.secondary_name}>
                        {call.clients.secondary_name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs truncate block max-w-[100px]" title={call.equipment_description}>
                    {call.equipment_description || "-"}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(call.scheduled_date)}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm truncate block max-w-[90px]" title={call.technicians?.full_name}>
                    {call.technicians?.full_name?.split(' ')[0] || "-"}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  {call.service_call_statuses ? (
                    <div className="inline-flex items-start gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                      <div
                        className="w-2 h-2 rounded-sm shrink-0 mt-0.5"
                        style={{ backgroundColor: call.service_call_statuses.color }}
                      />
                      <span className="text-xs leading-tight">{call.service_call_statuses.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  {call.commercial_status ? (
                    <div className="inline-flex items-start gap-1 px-1.5 py-0.5 rounded bg-muted/50">
                      <div
                        className="w-2 h-2 rounded-sm shrink-0 mt-0.5"
                        style={{ backgroundColor: call.commercial_status.color }}
                      />
                      <span className="text-xs leading-tight">{call.commercial_status.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                  <ServiceCallMarkersList markers={callMarkers} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
