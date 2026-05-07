import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useSatisfactionReport } from "@/hooks/useSatisfactionReport";
import {
  Star,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  Wrench,
  HeartHandshake,
} from "lucide-react";
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

function RatingStars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const rounded = Math.round(value * 10) / 10;
  return (
    <span className="flex items-center gap-1">
      <Star
        className={`h-4 w-4 ${rounded >= 4 ? "text-yellow-500 fill-yellow-500" : rounded >= 3 ? "text-orange-400 fill-orange-400" : "text-red-500 fill-red-500"}`}
      />
      <span className="font-medium">{rounded.toFixed(1)}</span>
    </span>
  );
}

function RankBadge({ position }: { position: number }) {
  if (position === 1)
    return <Badge className="bg-yellow-500 text-white">🥇 1º</Badge>;
  if (position === 2)
    return <Badge className="bg-gray-400 text-white">🥈 2º</Badge>;
  if (position === 3)
    return <Badge className="bg-amber-700 text-white">🥉 3º</Badge>;
  return <Badge variant="outline">{position}º</Badge>;
}

export default function SatisfacaoTecnicos() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const { data, isLoading } = useSatisfactionReport(selectedYear, month);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const chartData = (data?.technicians || []).map((t) => ({
    name: t.technician_name.split(" ")[0],
    servico: Number(t.avg_service.toFixed(1)),
    atendimento: Number(t.avg_attendance.toFixed(1)),
  }));

  return (
    <PageContainer>
      <PageHeader title="Satisfação por Técnico" />

      {/* Filtros */}
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

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Pesquisas Enviadas
              </p>
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="mt-2">
                <p className="text-2xl font-bold">{data?.totalSurveys || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {data?.totalResponses || 0} respondidas (
                  {data?.responseRate?.toFixed(0) || 0}%)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Média Serviço
              </p>
              <Wrench className="h-5 w-5 text-green-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {data?.avgService?.toFixed(1) || "—"}
                </p>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Média Atendimento
              </p>
              <HeartHandshake className="h-5 w-5 text-purple-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {data?.avgAttendance?.toFixed(1) || "—"}
                </p>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Alertas (nota ≤ 3)
              </p>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-2 text-red-600">
                {data?.totalAlerts || 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico comparativo */}
      {!isLoading && chartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ranking por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="servico"
                  name="Serviço"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="atendimento"
                  name="Atendimento"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.technicians?.length ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma pesquisa encontrada no período selecionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-center">Pesquisas</TableHead>
                  <TableHead className="text-center">Respondidas</TableHead>
                  <TableHead className="text-center">Taxa</TableHead>
                  <TableHead className="text-center">Serviço</TableHead>
                  <TableHead className="text-center">Atendimento</TableHead>
                  <TableHead className="text-center">Geral</TableHead>
                  <TableHead className="text-center">Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.technicians.map((tech, i) => (
                  <TableRow key={tech.technician_id}>
                    <TableCell>
                      <RankBadge position={i + 1} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {tech.technician_name}
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.total_surveys}
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.total_responses}
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.response_rate.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <RatingStars value={tech.avg_service} />
                    </TableCell>
                    <TableCell className="text-center">
                      <RatingStars value={tech.avg_attendance} />
                    </TableCell>
                    <TableCell className="text-center">
                      <RatingStars value={tech.avg_overall} />
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.alerts_count > 0 ? (
                        <Badge variant="destructive">{tech.alerts_count}</Badge>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
