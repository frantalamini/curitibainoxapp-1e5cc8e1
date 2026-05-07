import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  usePurchaseOrder,
  usePurchaseOrders,
  usePurchaseOrderItems,
  type PurchaseOrderItemInsert,
} from "@/hooks/usePurchaseOrders";
import { supabase } from "@/integrations/supabase/client";

interface ItemLocal {
  id?: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit: string;
  unit_cost: number;
  notes: string | null;
}

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existingOrder, isLoading: loadingOrder } = usePurchaseOrder(id);
  const { createOrder, updateOrder } = usePurchaseOrders();
  const {
    items: existingItems,
    addItem,
    updateItem,
    removeItem,
  } = usePurchaseOrderItems(id);

  const [form, setForm] = useState({
    supplier_id: "",
    cost_center_id: "",
    payment_terms: "",
    expected_delivery: "",
    delivery_address: "",
    freight_cost: "0",
    discount_percent: "0",
    discount_value: "0",
    notes: "",
  });

  const [items, setItems] = useState<ItemLocal[]>([
    {
      product_id: null,
      description: "",
      qty: 1,
      unit: "UN",
      unit_cost: 0,
      notes: null,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [costCenters, setCostCenters] = useState<
    { id: string; name: string }[]
  >([]);
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string | null }[]
  >([]);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, full_name")
      .contains("tipos", ["fornecedor"])
      .order("full_name")
      .then(({ data }) => {
        if (data) setSuppliers(data);
      });
    supabase
      .from("cost_centers")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setCostCenters(data);
      });
    supabase
      .from("products")
      .select("id, name, sku")
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data);
      });
  }, []);

  useEffect(() => {
    if (existingOrder) {
      setForm({
        supplier_id: existingOrder.supplier_id || "",
        cost_center_id: existingOrder.cost_center_id || "",
        payment_terms: existingOrder.payment_terms || "",
        expected_delivery: existingOrder.expected_delivery || "",
        delivery_address: existingOrder.delivery_address || "",
        freight_cost: existingOrder.freight_cost?.toString() || "0",
        discount_percent: existingOrder.discount_percent?.toString() || "0",
        discount_value: existingOrder.discount_value?.toString() || "0",
        notes: existingOrder.notes || "",
      });
    }
  }, [existingOrder]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(
        existingItems.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          description: i.description,
          qty: Number(i.qty),
          unit: i.unit,
          unit_cost: Number(i.unit_cost),
          notes: i.notes,
        })),
      );
    }
  }, [existingItems]);

  const addItemRow = () =>
    setItems([
      ...items,
      {
        product_id: null,
        description: "",
        qty: 1,
        unit: "UN",
        unit_cost: 0,
        notes: null,
      },
    ]);
  const removeItemRow = (idx: number) =>
    setItems(items.filter((_, i) => i !== idx));

  const updateItemRow = (idx: number, field: keyof ItemLocal, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    if (field === "product_id" && value) {
      const p = products.find((p) => p.id === value);
      if (p) updated[idx].description = p.name;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0);
  const freight = Number(form.freight_cost) || 0;
  const discountPct = Number(form.discount_percent) || 0;
  const discountVal = Number(form.discount_value) || 0;
  const total =
    subtotal +
    freight -
    (discountPct > 0 ? (subtotal * discountPct) / 100 : discountVal);

  const handleSave = async () => {
    if (!form.supplier_id) {
      toast.error("Selecione um fornecedor");
      return;
    }
    const validItems = items.filter(
      (i) => i.description.trim() && i.unit_cost > 0,
    );
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateOrder.mutateAsync({
          id: id!,
          supplier_id: form.supplier_id,
          cost_center_id: form.cost_center_id || null,
          payment_terms: form.payment_terms || null,
          expected_delivery: form.expected_delivery || null,
          delivery_address: form.delivery_address || null,
          freight_cost: freight,
          discount_percent: discountPct,
          discount_value: discountVal,
          subtotal,
          total,
          notes: form.notes || null,
        });

        const existingIds = items.filter((i) => i.id).map((i) => i.id!);
        const toRemove = existingItems.filter(
          (ei) => !existingIds.includes(ei.id),
        );
        for (const r of toRemove) await removeItem.mutateAsync(r.id);

        for (const item of validItems) {
          if (item.id) {
            await updateItem.mutateAsync({
              id: item.id,
              product_id: item.product_id || null,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              unit_cost: item.unit_cost,
              notes: item.notes,
            });
          } else {
            await addItem.mutateAsync({
              order_id: id!,
              product_id: item.product_id || null,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              unit_cost: item.unit_cost,
              notes: item.notes,
            });
          }
        }
      } else {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) throw new Error("Usuário não autenticado");

        const result = await createOrder.mutateAsync({
          supplier_id: form.supplier_id,
          cost_center_id: form.cost_center_id || null,
          payment_terms: form.payment_terms || null,
          expected_delivery: form.expected_delivery || null,
          delivery_address: form.delivery_address || null,
          freight_cost: freight,
          discount_percent: discountPct,
          discount_value: discountVal,
          subtotal,
          total,
          notes: form.notes || null,
          created_by: userId,
        });

        for (const item of validItems) {
          await addItem.mutateAsync({
            order_id: result.id,
            product_id: item.product_id || null,
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            unit_cost: item.unit_cost,
            notes: item.notes,
          });
        }
      }

      navigate("/compras/pedidos");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar pedido");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingOrder) {
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
            onClick={() => navigate("/compras/pedidos")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? `Pedido #${existingOrder?.order_number}`
              : "Novo Pedido de Compra"}
          </h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Fornecedor *</Label>
              <Select
                value={form.supplier_id}
                onValueChange={(v) => setForm({ ...form, supplier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Select
                value={form.cost_center_id}
                onValueChange={(v) => setForm({ ...form, cost_center_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Previsão de Entrega</Label>
              <Input
                type="date"
                value={form.expected_delivery}
                onChange={(e) =>
                  setForm({ ...form, expected_delivery: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Condição de Pagamento</Label>
              <Input
                placeholder="Ex: 30/60/90"
                value={form.payment_terms}
                onChange={(e) =>
                  setForm({ ...form, payment_terms: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.freight_cost}
                onChange={(e) =>
                  setForm({ ...form, freight_cost: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.discount_percent}
                onChange={(e) =>
                  setForm({ ...form, discount_percent: e.target.value })
                }
              />
            </div>
            <div className="lg:col-span-3">
              <Label>Endereço de Entrega</Label>
              <Input
                value={form.delivery_address}
                onChange={(e) =>
                  setForm({ ...form, delivery_address: e.target.value })
                }
              />
            </div>
            <div className="lg:col-span-3">
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens do Pedido</CardTitle>
            <Button size="sm" variant="outline" onClick={addItemRow}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Produto</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Qtd</TableHead>
                    <TableHead className="w-20">Unid.</TableHead>
                    <TableHead className="w-32">Preço Unit.</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={item.product_id || ""}
                          onValueChange={(v) =>
                            updateItemRow(idx, "product_id", v || null)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Avulso" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.sku ? `${p.sku} - ` : ""}
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={item.description}
                          onChange={(e) =>
                            updateItemRow(idx, "description", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={item.qty}
                          onChange={(e) =>
                            updateItemRow(idx, "qty", Number(e.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={item.unit}
                          onChange={(e) =>
                            updateItemRow(idx, "unit", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_cost || ""}
                          onChange={(e) =>
                            updateItemRow(
                              idx,
                              "unit_cost",
                              Number(e.target.value),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(item.qty * item.unit_cost).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItemRow(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col items-end gap-1 mt-3 text-sm">
              <div>
                Subtotal:{" "}
                {subtotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              {freight > 0 && (
                <div>
                  Frete: +
                  {freight.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
              {discountPct > 0 && <div>Desconto: -{discountPct}%</div>}
              <div className="text-lg font-semibold">
                Total:{" "}
                {total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/compras/pedidos")}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{" "}
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
