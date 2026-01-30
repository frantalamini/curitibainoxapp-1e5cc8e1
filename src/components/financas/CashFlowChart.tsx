import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectedBalance } from "@/hooks/useCashFlowProjection";

interface CashFlowChartProps {
  data: ProjectedBalance[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = useMemo(() => {
    // Sample data for better visualization (every 3 days for large datasets)
    const sampleRate = data.length > 60 ? 3 : data.length > 30 ? 2 : 1;
    
    return data
      .filter((_, index) => index % sampleRate === 0 || index === data.length - 1)
      .map((item) => ({
        date: item.date,
        dateLabel: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
        saldo: item.closingBalance,
        isProjected: item.isProjected,
        income: item.income,
        expense: item.expense,
      }));
  }, [data]);

  const minValue = Math.min(...chartData.map((d) => d.saldo));
  const maxValue = Math.max(...chartData.map((d) => d.saldo));
  const yAxisMin = Math.min(0, minValue * 1.1);
  const yAxisMax = maxValue * 1.1;

  // Find index where projection starts
  const projectionStartIndex = chartData.findIndex((d) => d.isProjected);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="dateLabel"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            tickFormatter={(value) => formatCurrency(value)}
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => {
              if (name === "saldo") return [formatCurrency(value), "Saldo"];
              return [formatCurrency(value), name];
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
          {projectionStartIndex > 0 && (
            <ReferenceLine
              x={chartData[projectionStartIndex]?.dateLabel}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{
                value: "Projeção",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="saldo"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSaldo)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
