import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVehicleCostsReport } from "@/hooks/useVehicleCostsReport";
import { 
  Car, 
  Fuel,
  Route,
  Wrench,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

const MONTHS = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function CustosPorVeiculo() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const {
    summaries,
    grandTotal,
    totalKm,
    totalTrips,
    totalMaintenances,
    isLoading,
  } = useVehicleCostsReport(selectedYear, month);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Prepare chart data
  const chartData = summaries.slice(0, 10).map((s) => ({
    name: s.name,
    km: s.totalKm,
    custo: s.fuelCostEstimate,
  }));

  return (
    <PageContainer>
      <PageHeader title="Custos por Veículo" />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(grandTotal)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Km Rodados</p>
              <Route className="h-5 w-5 text-blue-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2">
                {formatNumber(totalKm)} km
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Viagens</p>
              <Car className="h-5 w-5 text-green-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2">{totalTrips}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Manutenções</p>
              <Wrench className="h-5 w-5 text-amber-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2">{totalMaintenances}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5" />
            Km Rodados por Veículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "km" ? `${formatNumber(value)} km` : formatCurrency(value)
                  }
                />
                <Bar
                  dataKey="km"
                  name="Km Rodados"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado no período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Detalhamento por Veículo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum veículo encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-center">Viagens</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-center">Manutenções</TableHead>
                    <TableHead className="text-right">Combustível (Est.)</TableHead>
                    <TableHead className="text-right">Custo/Km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((veh) => (
                    <TableRow key={veh.id}>
                      <TableCell className="font-medium">{veh.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {veh.plate}
                      </TableCell>
                      <TableCell className="text-center">{veh.tripsCount}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(veh.totalKm)}
                      </TableCell>
                      <TableCell className="text-center">
                        {veh.maintenanceCount}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(veh.fuelCostEstimate)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {veh.totalKm > 0
                          ? `R$ ${veh.costPerKm.toFixed(2)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-center">{totalTrips}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(totalKm)}
                    </TableCell>
                    <TableCell className="text-center">
                      {totalMaintenances}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(grandTotal)}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
