import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCallData {
  id: string;
  scheduled_time: string;
  status: string;
  equipment_description: string;
  notes?: string | null;
  urgency?: string;
  clients?: {
    full_name: string;
    company_name?: string;
    phone?: string;
  } | null;
}

interface ScheduleEventCardProps {
  call: ServiceCallData;
  technicianName?: string;
  variant?: "compact" | "normal" | "detailed";
  showTechnician?: boolean;
  onClick?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "border-l-yellow-500";
    case "in_progress":
      return "border-l-blue-500";
    case "completed":
      return "border-l-green-500";
    case "cancelled":
      return "border-l-red-500";
    default:
      return "border-l-muted-foreground";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Pendente";
    case "in_progress":
      return "Em Andamento";
    case "completed":
      return "Concluído";
    case "cancelled":
      return "Cancelado";
    case "on_hold":
      return "Em Espera";
    default:
      return status;
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "completed":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ScheduleEventCard = ({
  call,
  technicianName,
  variant = "normal",
  showTechnician = true,
  onClick,
}: ScheduleEventCardProps) => {
  const clientName = call.clients?.company_name || call.clients?.full_name || "Cliente";

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={onClick}
              className={cn(
                "text-xs p-1.5 rounded border-l-4 bg-muted/50 hover:bg-muted cursor-pointer transition-colors min-w-0",
                getStatusColor(call.status)
              )}
            >
              <div className="font-medium truncate">
                {call.scheduled_time} - {clientName}
              </div>
              <div className="text-muted-foreground truncate">
                {call.equipment_description}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[300px]">
            <div className="space-y-2">
              <div>
                <div className="font-semibold">{clientName}</div>
                {call.clients?.phone && (
                  <div className="text-sm text-muted-foreground">{call.clients.phone}</div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium">Equipamento:</div>
                <div className="text-sm">{call.equipment_description}</div>
              </div>
              {showTechnician && technicianName && (
                <div>
                  <div className="text-sm font-medium">Técnico:</div>
                  <div className="text-sm">{technicianName}</div>
                </div>
              )}
              {call.notes && (
                <div>
                  <div className="text-sm font-medium">Observações:</div>
                  <div className="text-sm">{call.notes}</div>
                </div>
              )}
              <Badge variant="outline" className={getStatusBadgeVariant(call.status)}>
                {getStatusLabel(call.status)}
              </Badge>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal and detailed variants
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border-l-4 bg-card border hover:shadow-md cursor-pointer transition-all min-w-0",
        getStatusColor(call.status)
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Time and Client */}
        <div className="flex items-start gap-2 min-w-0">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm">{call.scheduled_time}</span>
            <span className="mx-2 text-muted-foreground">-</span>
            <span className="font-medium break-words">{clientName}</span>
          </div>
        </div>

        {/* Equipment */}
        <div className="flex items-start gap-2 min-w-0">
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-sm text-muted-foreground break-words min-w-0">
            {call.equipment_description}
          </span>
        </div>

        {/* Technician */}
        {showTechnician && technicianName && (
          <div className="flex items-start gap-2 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-sm break-words min-w-0">{technicianName}</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="outline" className={cn("text-xs", getStatusBadgeVariant(call.status))}>
            {getStatusLabel(call.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEventCard;
