import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateReceiptFromOrder,
  usePurchaseReceipts,
  usePurchaseReceiptItems,
} from "@/hooks/usePurchaseReceipts";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptItemLocal {
  id?: string;
  order_item_id: string | null;
  product_id: string | null;
  description: string;
  qty_expected: number;
  qty_received: number;
  qty_rejected: number;
  unit_cost: number | null;
  rejection_reason: string;
  batch_number: string;
  expiry_date: string;
}

export default function PurchaseReceiptForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const orderIdFromUrl = searchParams.get("orderId");

  const {
    items: existingItems,
    addItem,
    updateItem,
  } = usePurchaseReceiptItems(id);
  const createFromOrder = useCreateReceiptFromOrder();

  const [receiptId, setReceiptId] = useState(id || "");
  const [receiptData, setReceiptData] = useState<any>(null);
  const [items, setItems] = useState<ReceiptItemLocal[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create from order or load existing
  useEffect(() => {
    const init = async () => {
      if (isEdit && id) {
        const { data } = await supabase
          .from("purchase_receipts")
          .select(
            `*, supplier:clients!purchase_receipts_supplier_id_fkey (id, full_name), purchase_orders (id, order_number)`,
          )
          .eq("id", id)
          .single();
        if (data) {
          setReceiptData(data);
          setInspectionNotes(data.inspection_notes || "");
        }
      } else if (orderIdFromUrl) {
        const { data: session } = await supabase.auth.getSession();
        try {
          const result = await createFromOrder.mutateAsync({
            orderId: orderIdFromUrl,
            receivedBy: session.session!.user.id,
          });
          setReceiptId(result.id);
          // Reload the receipt
          const { data } = await supabase
            .from("purchase_receipts")
            .select(
              `*, supplier:clients!purchase_receipts_supplier_id_fkey (id, full_name), purchase_orders (id, order_number), purchase_receipt_items (*)`,
            )
            .eq("id", result.id)
            .single();
          if (data) {
            setReceiptData(data);
            setItems(
              data.purchase_receipt_items.map((i: any) => ({
                id: i.id,
                order_item_id: i.order_item_id,
                product_id: i.product_id,
                description: i.description,
                qty_expected: Number(i.qty_expected),
                qty_received: Number(i.qty_received),
                qty_rejected: Number(i.qty_rejected || 0),
                unit_cost: i.unit_cost ? Number(i.unit_cost) : null,
                rejection_reason: i.rejection_reason || "",
                batch_number: i.batch_number || "",
                expiry_date: i.expiry_date || "",
              })),
            );
          }
        } catch (e) {
          toast.error("Erro ao criar recebimento");
          navigate("/compras/recebimentos");
          return;
        }
      }
      setLoading(false);
    };
    init();
  }, [id, orderIdFromUrl]);

  // Load items for edit
  useEffect(() => {
    if (existingItems.length > 0 && isEdit) {
      setItems(
        existingItems.map((i) => ({
          id: i.id,
          order_item_id: i.order_item_id,
          product_id: i.product_id,
          description: i.description,
          qty_expected: Number(i.qty_expected),
          qty_received: Number(i.qty_received),
          qty_rejected: Number(i.qty_rejected || 0),
          unit_cost: i.unit_cost ? Number(i.unit_cost) : null,
          rejection_reason: i.rejection_reason || "",
          batch_number: i.batch_number || "",
          expiry_date: i.expiry_date || "",
        })),
      );
    }
  }, [existingItems, isEdit]);

  const updateItemRow = (
    idx: number,
    field: keyof ReceiptItemLocal,
    value: any,
  ) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const hasDivergence = items.some(
    (i) => i.qty_rejected > 0 || i.qty_received !== i.qty_expected,
  );

  const handleSave = async () => {
    const targetId = receiptId || id;
    if (!targetId) return;

    setSaving(true);
    try {
      // Update inspection notes
      await supabase
        .from("purchase_receipts")
        .update({
          inspection_notes: inspectionNotes || null,
          has_divergence: hasDivergence,
        })
        .eq("id", targetId);

      // Update items
      for (const item of items) {
        if (item.id) {
          await supabase
            .from("purchase_receipt_items")
            .update({
              qty_received: item.qty_received,
              qty_rejected: item.qty_rejected,
              rejection_reason: item.rejection_reason || null,
              batch_number: item.batch_number || null,
              expiry_date: item.expiry_date || null,
            })
            .eq("id", item.id);
        }
      }

      toast.success("Recebimento salvo!");
      navigate("/compras/recebimentos");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">
              Carregando...
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/compras/recebimentos")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {receiptData
              ? `Recebimento #${receiptData.receipt_number} — Pedido #${receiptData.purchase_orders?.order_number}`
              : "Novo Recebimento"}
          </h1>
          {hasDivergence && (
            <Badge
              variant="outline"
              className="gap-1 text-orange-600 border-orange-600"
            >
              <AlertTriangle className="h-3 w-3" /> Divergência
            </Badge>
          )}
        </div>

        {receiptData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">
                  Fornecedor
                </Label>
                <div className="font-medium">
                  {receiptData.supplier?.full_name}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Pedido</Label>
                <div className="font-medium">
                  #{receiptData.purchase_orders?.order_number}
                </div>
              </div>
              <div>
                <Label>Notas de Inspeção</Label>
                <Textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Conferência de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28 text-center">Esperado</TableHead>
                    <TableHead className="w-28 text-center">Recebido</TableHead>
                    <TableHead className="w-28 text-center">
                      Rejeitado
                    </TableHead>
                    <TableHead className="w-36">Motivo Rejeição</TableHead>
                    <TableHead className="w-28">Lote</TableHead>
                    <TableHead className="w-32">Validade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => {
                    const isDivergent =
                      item.qty_received !== item.qty_expected ||
                      item.qty_rejected > 0;
                    return (
                      <TableRow
                        key={idx}
                        className={isDivergent ? "bg-orange-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.qty_expected}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-center"
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.qty_received}
                            onChange={(e) =>
                              updateItemRow(
                                idx,
                                "qty_received",
                                Number(e.target.value),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-center"
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.qty_rejected}
                            onChange={(e) =>
                              updateItemRow(
                                idx,
                                "qty_rejected",
                                Number(e.target.value),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={item.rejection_reason}
                            onChange={(e) =>
                              updateItemRow(
                                idx,
                                "rejection_reason",
                                e.target.value,
                              )
                            }
                            placeholder={
                              item.qty_rejected > 0 ? "Obrigatório" : ""
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={item.batch_number}
                            onChange={(e) =>
                              updateItemRow(idx, "batch_number", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) =>
                              updateItemRow(idx, "expiry_date", e.target.value)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/compras/recebimentos")}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{" "}
            {saving ? "Salvando..." : "Salvar Conferência"}
          </Button>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
