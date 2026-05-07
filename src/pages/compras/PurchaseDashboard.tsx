import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  AlertTriangle,
  TrendingDown,
  Package,
  ClipboardList,
  FileText,
} from "lucide-react";
import { usePurchaseDashboard } from "@/hooks/usePurchaseDashboard";
import { format, startOfMonth, endOfMonth } from "date-fns";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PurchaseDashboard() {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(
    format(startOfMonth(today), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const {
    isLoading,
    totalComprado,
    pedidosPendentes,
    pedidosRecebidos,
    divergencias,
    avgApprovalHours,
    topSuppliers,
    topItems,
    totalSavings,
    requestsByStatus,
    totalRequests,
    totalOrders,
    totalQuotations,
  } = usePurchaseDashboard({ from: dateFrom, to: dateTo });

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)} dias`;
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Indicadores de Compras" />

        <div className="flex items-end gap-4 mb-6">
          <div>
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">
              Carregando...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Comprado
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(totalComprado)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Pedidos Pendentes
                      </p>
                      <p className="text-xl font-bold">{pedidosPendentes}</p>
                      <p className="text-xs text-muted-foreground">
                        {pedidosRecebidos} recebidos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tempo Médio Aprovação
                      </p>
                      <p className="text-xl font-bold">
                        {formatHours(avgApprovalHours)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Divergências
                      </p>
                      <p className="text-xl font-bold">{divergencias}</p>
                      <p className="text-xs text-muted-foreground">
                        recebimentos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Resumo + Economia */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Economia via Cotação
                      </p>
                      <p className="text-xl font-bold">
                        {formatCurrency(totalSavings)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        diferença maior vs menor cotação
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-6">
                  <div className="text-center">
                    <ClipboardList className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold">{totalRequests}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitações
                    </p>
                  </div>
                  <div className="text-center">
                    <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold">{totalQuotations}</p>
                    <p className="text-xs text-muted-foreground">Cotações</p>
                  </div>
                  <div className="text-center">
                    <ShoppingCart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-2xl font-bold">{totalOrders}</p>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-3">
                    Solicitações por Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {requestsByStatus.PENDING > 0 && (
                      <Badge variant="outline">
                        Pendentes: {requestsByStatus.PENDING}
                      </Badge>
                    )}
                    {requestsByStatus.APPROVED > 0 && (
                      <Badge variant="default">
                        Aprovadas: {requestsByStatus.APPROVED}
                      </Badge>
                    )}
                    {requestsByStatus.REJECTED > 0 && (
                      <Badge variant="destructive">
                        Rejeitadas: {requestsByStatus.REJECTED}
                      </Badge>
                    )}
                    {requestsByStatus.ORDERED > 0 && (
                      <Badge variant="default">
                        Pedidas: {requestsByStatus.ORDERED}
                      </Badge>
                    )}
                    {requestsByStatus.DRAFT > 0 && (
                      <Badge variant="secondary">
                        Rascunho: {requestsByStatus.DRAFT}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables: Top Fornecedores + Top Itens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" /> Top Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topSuppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sem dados no período.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-center">
                              Pedidos
                            </TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topSuppliers.map((s, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {s.name}
                              </TableCell>
                              <TableCell className="text-center">
                                {s.count}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(s.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Itens Mais Comprados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sem dados no período.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center">Qtd</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {item.description}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.qty}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageContainer>
    </MainLayout>
  );
}
