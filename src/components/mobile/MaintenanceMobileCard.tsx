import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Wrench, Car, Calendar } from "lucide-react";
import { MaintenanceType } from "@/hooks/useVehicleMaintenances";

interface MaintenanceData {
  id: string;
  maintenance_type: MaintenanceType;
  started_at: string;
  finished_at: string | null;
  vehicles?: {
    name: string;
    plate: string;
    brand: string | null;
  } | null;
}

interface MaintenanceMobileCardProps {
  maintenance: MaintenanceData;
}

const getMaintenanceTypeLabel = (type: MaintenanceType) => {
  const labels = {
    preventiva: "Preventiva",
    corretiva: "Corretiva",
    colisao: "Colisão",
  };
  return labels[type];
};

const getMaintenanceTypeBadge = (type: MaintenanceType) => {
  const variants: Record<MaintenanceType, string> = {
    preventiva: "bg-blue-500",
    corretiva: "bg-orange-500",
    colisao: "bg-red-500",
  };
  return (
    <Badge className={`${variants[type]} text-white`}>
      {getMaintenanceTypeLabel(type)}
    </Badge>
  );
};

const getStatusBadge = (finishedAt: string | null) => {
  if (finishedAt) {
    return <Badge className="bg-green-500 text-white">Concluída</Badge>;
  }
  return <Badge className="bg-yellow-500 text-white">Em manutenção</Badge>;
};

export function MaintenanceMobileCard({ maintenance }: MaintenanceMobileCardProps) {
  return (
    <Card className="w-full max-w-full min-w-0">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Wrench className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {maintenance.vehicles ? (
                <>
                  <p className="font-medium text-foreground truncate">
                    {maintenance.vehicles.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {maintenance.vehicles.plate}
                    {maintenance.vehicles.brand && ` - ${maintenance.vehicles.brand}`}
                  </p>
                </>
              ) : (
                <p className="font-medium text-foreground">-</p>
              )}
            </div>
          </div>
          {getStatusBadge(maintenance.finished_at)}
        </div>

        {/* Type Badge */}
        <div className="flex items-center gap-2">
          {getMaintenanceTypeBadge(maintenance.maintenance_type)}
        </div>

        {/* Dates */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-medium">Início:</span>{" "}
                {format(new Date(maintenance.started_at), "dd/MM/yyyy HH:mm")}
              </p>
              {maintenance.finished_at && (
                <p>
                  <span className="font-medium">Fim:</span>{" "}
                  {format(new Date(maintenance.finished_at), "dd/MM/yyyy HH:mm")}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
