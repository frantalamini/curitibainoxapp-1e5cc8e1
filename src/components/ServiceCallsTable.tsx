import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import type { ServiceCall } from "@/hooks/useServiceCalls";

type ServiceCallsTableProps = {
  calls: ServiceCall[];
  onRowClick: (id: string) => void;
};

export const ServiceCallsTable = ({
  calls,
  onRowClick,
}: ServiceCallsTableProps) => {
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-16">Nº OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="w-[12%]">Data</TableHead>
            <TableHead className="w-[12%]">Técnico</TableHead>
            <TableHead className="w-[14%]">
              <span className="block">Status</span>
              <span className="block">Técnico</span>
            </TableHead>
            <TableHead className="w-[14%]">
              <span className="block">Status</span>
              <span className="block">Comercial</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow
              key={call.id}
              tabIndex={0}
              className="hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => onRowClick(call.id)}
              onKeyDown={(e) => handleKeyDown(e, call.id)}
            >
              <TableCell>
                <span className="text-sm font-mono font-semibold text-primary">
                  #{call.os_number}
                </span>
              </TableCell>
              <TableCell
                className="cursor-pointer hover:underline hover:text-blue-600 transition-colors"
              >
                <div className="flex flex-col max-w-[220px]">
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
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDate(call.scheduled_date)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm truncate block max-w-[100px]" title={call.technicians?.full_name}>
                  {call.technicians?.full_name?.split(' ')[0] || "-"}
                </span>
              </TableCell>
              <TableCell>
                {call.service_call_statuses ? (
                  <div className="inline-flex items-start gap-1.5 px-2 py-1 rounded bg-muted/50">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: call.service_call_statuses.color }}
                    />
                    <span className="text-xs leading-tight">{call.service_call_statuses.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {call.commercial_status ? (
                  <div className="inline-flex items-start gap-1.5 px-2 py-1 rounded bg-muted/50">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: call.commercial_status.color }}
                    />
                    <span className="text-xs leading-tight">{call.commercial_status.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
