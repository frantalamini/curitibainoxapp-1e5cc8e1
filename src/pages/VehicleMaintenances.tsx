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
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const VehicleMaintenances = () => {
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
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Manutenções de Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Veículo</label>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Manutenção</label>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Data Início (De)</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Início (Até)</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo de Manutenção</TableHead>
                      <TableHead>Data/Hora Início</TableHead>
                      <TableHead>Data/Hora Fim</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma manutenção encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      maintenances.map((maintenance) => (
                        <TableRow key={maintenance.id}>
                          <TableCell>
                            {maintenance.vehicles ? (
                              <div>
                                <div className="font-medium">{maintenance.vehicles.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {maintenance.vehicles.plate}
                                  {maintenance.vehicles.brand && ` - ${maintenance.vehicles.brand}`}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{getMaintenanceTypeBadge(maintenance.maintenance_type)}</TableCell>
                          <TableCell>
                            {format(new Date(maintenance.started_at), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {maintenance.finished_at
                              ? format(new Date(maintenance.finished_at), "dd/MM/yyyy HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(maintenance.finished_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default VehicleMaintenances;
