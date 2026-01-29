import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useVehicleMaintenances, MaintenanceType } from "@/hooks/useVehicleMaintenances";
import { useVehicles } from "@/hooks/useVehicles";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceMobileCard } from "@/components/mobile/MaintenanceMobileCard";
import { Wrench } from "lucide-react";

const VehicleMaintenances = () => {
  const isMobile = useIsMobile();
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | "">("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { vehicles } = useVehicles();
  const { maintenances, isLoading } = useVehicleMaintenances({
    vehicle_id: vehicleFilter || undefined,
    maintenance_type: typeFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 flex-shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold">Manutenções de Veículos</h1>
        </div>

        <Card className="w-full max-w-full min-w-0">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium block">Veículo</label>
                <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Tipo de Manutenção</label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MaintenanceType | "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="colisao">Colisão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Data Início (De)</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Data Início (Até)</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-full min-w-0">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : maintenances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma manutenção encontrada
              </div>
            ) : isMobile ? (
              // Mobile: Cards
              <div className="space-y-3">
                {maintenances.map((maintenance) => (
                  <MaintenanceMobileCard
                    key={maintenance.id}
                    maintenance={maintenance}
                  />
                ))}
              </div>
            ) : (
              // Desktop: Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Veículo</TableHead>
                    <TableHead className="w-28">Tipo</TableHead>
                    <TableHead className="w-32">Início</TableHead>
                    <TableHead className="w-32">Fim</TableHead>
                    <TableHead className="w-24">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell>
                        {maintenance.vehicles ? (
                          <div>
                            <div className="font-medium text-sm">{maintenance.vehicles.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {maintenance.vehicles.plate}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getMaintenanceTypeBadge(maintenance.maintenance_type)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(maintenance.started_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {maintenance.finished_at
                          ? format(new Date(maintenance.finished_at), "dd/MM/yy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(maintenance.finished_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default VehicleMaintenances;
