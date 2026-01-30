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
import { useTechnicianCostsReport } from "@/hooks/useTechnicianCostsReport";
import { 
  Users, 
  Receipt, 
  Fuel,
  Route,
  TrendingDown,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

export default function CustosPorTecnico() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const {
    summaries,
    grandTotal,
    totalReimbursements,
    totalFuel,
    totalKm,
    isLoading,
  } = useTechnicianCostsReport(selectedYear, month);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Prepare chart data (top 10 technicians)
  const chartData = summaries.slice(0, 10).map((s) => ({
    name: s.name.split(" ")[0], // First name only for chart
    reembolsos: s.reimbursementsTotal,
    combustivel: s.fuelCostEstimate,
  }));

  return (
    <PageContainer>
      <PageHeader title="Custos por Técnico" />

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
              <p className="text-sm font-medium text-muted-foreground">Reembolsos</p>
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {formatCurrency(totalReimbursements)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Combustível (Est.)</p>
              <Fuel className="h-5 w-5 text-blue-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(totalFuel)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Km Rodados</p>
              <Route className="h-5 w-5 text-green-500" />
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
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Custos por Técnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  className="text-xs"
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="reembolsos"
                  name="Reembolsos"
                  fill="hsl(var(--chart-1))"
                  stackId="a"
                />
                <Bar
                  dataKey="combustivel"
                  name="Combustível"
                  fill="hsl(var(--chart-2))"
                  stackId="a"
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
            <Calculator className="h-5 w-5" />
            Detalhamento por Técnico
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
              Nenhum técnico encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-center">OS</TableHead>
                    <TableHead className="text-center">Viagens</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Reembolsos</TableHead>
                    <TableHead className="text-right">Combustível</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Custo/OS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((tech) => (
                    <TableRow key={tech.id}>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell className="text-center">
                        {tech.serviceCallsCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {tech.tripsCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(tech.totalKm)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        {formatCurrency(tech.reimbursementsTotal)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(tech.fuelCostEstimate)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(tech.totalCost)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          tech.costPerServiceCall > 100
                            ? "text-red-600"
                            : "text-green-600"
                        )}
                      >
                        {formatCurrency(tech.costPerServiceCall)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-center">
                      {summaries.reduce((sum, s) => sum + s.serviceCallsCount, 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {summaries.reduce((sum, s) => sum + s.tripsCount, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(totalKm)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {formatCurrency(totalReimbursements)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(totalFuel)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
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
