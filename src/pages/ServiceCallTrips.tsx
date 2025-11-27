import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useServiceCallTrips } from "@/hooks/useServiceCallTrips";
import { useVehicles } from "@/hooks/useVehicles";
import { useTechnicians } from "@/hooks/useTechnicians";
import { format } from "date-fns";
import { Route, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ServiceCallTrips = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    vehicleId: "",
    technicianId: "",
  });

  const { data: trips, isLoading } = useServiceCallTrips(filters);
  const { vehicles } = useVehicles();
  const { technicians } = useTechnicians();

  const getStatusBadge = (status: string) => {
    if (status === "concluido") {
      return <Badge className="bg-green-500">Concluído</Badge>;
    }
    return <Badge className="bg-yellow-500">Em deslocamento</Badge>;
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Route className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Deslocamentos</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle">Veículo</Label>
                <Select
                  value={filters.vehicleId}
                  onValueChange={(value) => setFilters({ ...filters, vehicleId: value })}
                >
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Todos os veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os veículos</SelectItem>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician">Técnico</Label>
                <Select
                  value={filters.technicianId}
                  onValueChange={(value) => setFilters({ ...filters, technicianId: value })}
                >
                  <SelectTrigger id="technician">
                    <SelectValue placeholder="Todos os técnicos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os técnicos</SelectItem>
                    {technicians?.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora Início</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Km Início</TableHead>
                      <TableHead className="text-right">Km Fim</TableHead>
                      <TableHead className="text-right">Distância</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell>
                          {format(new Date(trip.started_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{trip.technicians?.full_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{trip.vehicles?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {trip.vehicles?.plate}
                              {trip.vehicles?.brand && ` • ${trip.vehicles.brand}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/service-calls/${trip.service_call_id}`)}
                          >
                            #{trip.service_calls?.os_number}
                          </Button>
                        </TableCell>
                        <TableCell>{trip.service_calls?.clients?.full_name}</TableCell>
                        <TableCell className="text-right">
                          {trip.start_odometer_km.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km
                        </TableCell>
                        <TableCell className="text-right">
                          {trip.end_odometer_km 
                            ? `${trip.end_odometer_km.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {trip.distance_km 
                            ? `${trip.distance_km.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km`
                            : "-"
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(trip.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum deslocamento encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ServiceCallTrips;
