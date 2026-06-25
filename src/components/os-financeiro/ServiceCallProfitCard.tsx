import { TrendingUp, TrendingDown, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useServiceCallProfitability } from "@/hooks/useServiceCallProfitability";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatHm = (hours: number) => {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
};

interface Props {
  serviceCallId?: string;
}

export function ServiceCallProfitCard({ serviceCallId }: Props) {
  const { data, isLoading } = useServiceCallProfitability(serviceCallId);

  if (!serviceCallId || isLoading || !data) {
    return (
      <Card className="mb-4">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {isLoading ? "Calculando lucro do chamado..." : null}
        </CardContent>
      </Card>
    );
  }

  const profit = data.grossProfit;
  const isPositive = profit >= 0;

  const costRows = [
    { label: "Peças/produtos", value: data.productCosts },
    { label: "Deslocamento", value: data.tripCosts },
    {
      label: `Mão de obra${data.laborHours > 0 ? ` (${formatHm(data.laborHours)})` : ""}`,
      value: data.laborCost,
    },
    { label: "Reembolsos", value: data.reimbursements },
  ];

  return (
    <Card className="mb-4 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            Lucro deste chamado
          </span>
          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
            <Lock className="h-3 w-3" /> Uso interno
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Receita */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Receita (faturado)</span>
          <span className="font-medium">{brl(data.totalRevenue)}</span>
        </div>

        {/* Custos */}
        <div className="space-y-1 rounded-md bg-muted/40 p-3">
          <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Custos
          </div>
          {costRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span>{brl(row.value)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm font-medium">
            <span>Total de custos</span>
            <span>{brl(data.totalCosts)}</span>
          </div>
        </div>

        {/* Lucro */}
        <div
          className={cn(
            "flex items-center justify-between rounded-md p-3",
            isPositive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <div>
            <div className="text-xs uppercase opacity-80">Lucro bruto</div>
            <div className="text-2xl font-bold tabular-nums">{brl(profit)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase opacity-80">Margem</div>
            <div className="text-2xl font-bold tabular-nums">
              {data.profitMargin.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Aviso: técnico sem custo/hora → mão de obra não contabilizada */}
        {!data.hasTechnicianCost && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              A mão de obra <strong>não está sendo contada</strong>: defina o
              custo/hora deste técnico no cadastro para o lucro ficar real.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ServiceCallProfitCard;
