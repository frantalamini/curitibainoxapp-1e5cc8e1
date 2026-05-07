import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Trophy } from "lucide-react";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import {
  useQuotationsByRequest,
  type PurchaseQuotation,
} from "@/hooks/usePurchaseQuotations";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PurchaseQuotationMap() {
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [confirmSelect, setConfirmSelect] = useState<string | null>(null);

  const { requests } = usePurchaseRequests({ status: "APPROVED" });
  // Also include requests with status PENDING that have quotations
  const { requests: allRequests } = usePurchaseRequests();
  const requestsWithQuotations = allRequests.filter((r) =>
    ["APPROVED", "PENDING"].includes(r.status),
  );

  const { data: quotations, isLoading } =
    useQuotationsByRequest(selectedRequestId);
  const { createFromQuotation } = usePurchaseOrders();

  // Get unique items across all quotations
  const allItemDescriptions = new Set<string>();
  quotations?.forEach((q) => {
    q.purchase_quotation_items?.forEach((i) => {
      allItemDescriptions.add(i.description);
    });
  });
  const itemDescriptions = Array.from(allItemDescriptions);

  // Find best price per item
  const bestPriceByItem: Record<
    string,
    { price: number; quotationId: string }
  > = {};
  itemDescriptions.forEach((desc) => {
    let best = { price: Infinity, quotationId: "" };
    quotations?.forEach((q) => {
      const item = q.purchase_quotation_items?.find(
        (i) => i.description === desc,
      );
      if (item && Number(item.unit_cost) < best.price) {
        best = { price: Number(item.unit_cost), quotationId: q.id };
      }
    });
    if (best.price < Infinity) bestPriceByItem[desc] = best;
  });

  // Find overall best quotation (lowest total)
  const bestQuotation = quotations?.reduce<PurchaseQuotation | null>(
    (best, q) => {
      if (!best || Number(q.total) < Number(best.total)) return q;
      return best;
    },
    null,
  );

  const handleSelectQuotation = async () => {
    if (!confirmSelect) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      await createFromQuotation.mutateAsync({
        quotationId: confirmSelect,
        createdBy: session.session!.user.id,
      });
    } catch (e) {
      /* handled */
    }
    setConfirmSelect(null);
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Mapa de Cotações" />

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="max-w-md">
              <Label>Selecione a Solicitação</Label>
              <Select
                value={selectedRequestId}
                onValueChange={setSelectedRequestId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma solicitação..." />
                </SelectTrigger>
                <SelectContent>
                  {requestsWithQuotations.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      #{r.request_number} —{" "}
                      {r.clients?.full_name || "Sem cliente"} (
                      {r.purchase_request_items?.length || 0} itens)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedRequestId && isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">
              Carregando cotações...
            </div>
          </div>
        )}

        {selectedRequestId &&
          !isLoading &&
          quotations &&
          quotations.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma cotação encontrada para esta solicitação.
            </div>
          )}

        {selectedRequestId &&
          !isLoading &&
          quotations &&
          quotations.length > 0 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">
                      {quotations.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cotações Recebidas
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {bestQuotation
                        ? Number(bestQuotation.total).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        : "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Menor Total ({bestQuotation?.supplier?.full_name})
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">
                      {itemDescriptions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Itens Comparados
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparativo por Item</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px] sticky left-0 bg-background">
                            Item
                          </TableHead>
                          {quotations.map((q) => (
                            <TableHead
                              key={q.id}
                              className="min-w-[180px] text-center"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold">
                                  {q.supplier?.full_name}
                                </span>
                                {bestQuotation?.id === q.id && (
                                  <Badge variant="default" className="gap-1">
                                    <Trophy className="h-3 w-3" /> Melhor Total
                                  </Badge>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemDescriptions.map((desc) => (
                          <TableRow key={desc}>
                            <TableCell className="font-medium sticky left-0 bg-background">
                              {desc}
                            </TableCell>
                            {quotations.map((q) => {
                              const item = q.purchase_quotation_items?.find(
                                (i) => i.description === desc,
                              );
                              const isBest =
                                bestPriceByItem[desc]?.quotationId === q.id;
                              return (
                                <TableCell
                                  key={q.id}
                                  className={`text-center ${isBest ? "bg-green-50 font-semibold text-green-700" : ""}`}
                                >
                                  {item ? (
                                    <div>
                                      <div>
                                        {Number(item.unit_cost).toLocaleString(
                                          "pt-BR",
                                          {
                                            style: "currency",
                                            currency: "BRL",
                                          },
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {Number(item.qty)} x ={" "}
                                        {Number(item.total).toLocaleString(
                                          "pt-BR",
                                          {
                                            style: "currency",
                                            currency: "BRL",
                                          },
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="font-bold border-t-2">
                          <TableCell className="sticky left-0 bg-background">
                            TOTAL
                          </TableCell>
                          {quotations.map((q) => (
                            <TableCell
                              key={q.id}
                              className={`text-center ${bestQuotation?.id === q.id ? "bg-green-50 text-green-700" : ""}`}
                            >
                              <div>
                                {Number(q.total).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </div>
                              {q.delivery_days && (
                                <div className="text-xs font-normal text-muted-foreground">
                                  {q.delivery_days} dias entrega
                                </div>
                              )}
                              {q.payment_terms && (
                                <div className="text-xs font-normal text-muted-foreground">
                                  {q.payment_terms}
                                </div>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        {/* Action Row */}
                        <TableRow>
                          <TableCell className="sticky left-0 bg-background"></TableCell>
                          {quotations.map((q) => (
                            <TableCell key={q.id} className="text-center">
                              {q.status === "RECEIVED" && (
                                <Button
                                  size="sm"
                                  onClick={() => setConfirmSelect(q.id)}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />{" "}
                                  Selecionar
                                </Button>
                              )}
                              {q.status === "SELECTED" && (
                                <Badge variant="default">Selecionada</Badge>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        <AlertDialog
          open={!!confirmSelect}
          onOpenChange={(open) => !open && setConfirmSelect(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Selecionar Cotação</AlertDialogTitle>
              <AlertDialogDescription>
                Ao selecionar esta cotação, um Pedido de Compra será gerado
                automaticamente com os itens e valores cotados. Deseja
                continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSelectQuotation}>
                Gerar Pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </MainLayout>
  );
}
