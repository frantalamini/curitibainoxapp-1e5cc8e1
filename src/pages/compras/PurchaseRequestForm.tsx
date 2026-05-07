import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
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
  usePurchaseRequest,
  usePurchaseRequests,
  usePurchaseRequestItems,
  type PurchaseRequestItemInsert,
} from "@/hooks/usePurchaseRequests";
import { useAccessProfiles } from "@/hooks/useAccessProfiles";
import { supabase } from "@/integrations/supabase/client";

interface ItemLocal {
  id?: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit: string;
  estimated_unit_cost: number | null;
  notes: string | null;
}

export default function PurchaseRequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProfile } = useAccessProfiles();
  const isEdit = !!id;

  const { data: existingRequest, isLoading: loadingRequest } =
    usePurchaseRequest(id);
  const { createRequest } = usePurchaseRequests();
  const {
    items: existingItems,
    addItem,
    updateItem,
    removeItem,
  } = usePurchaseRequestItems(id);

  const [form, setForm] = useState({
    client_id: "",
    service_call_id: "",
    equipment_id: "",
    cost_center_id: "",
    priority: "NORMAL",
    notes: "",
  });

  const [items, setItems] = useState<ItemLocal[]>([
    {
      product_id: null,
      description: "",
      qty: 1,
      unit: "UN",
      estimated_unit_cost: null,
      notes: null,
    },
  ]);

  const [saving, setSaving] = useState(false);

  // Load existing data
  useEffect(() => {
    if (existingRequest) {
      setForm({
        client_id: existingRequest.client_id || "",
        service_call_id: existingRequest.service_call_id || "",
        equipment_id: existingRequest.equipment_id || "",
        cost_center_id: existingRequest.cost_center_id || "",
        priority: existingRequest.priority,
        notes: existingRequest.notes || "",
      });
    }
  }, [existingRequest]);

  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(
        existingItems.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          description: i.description,
          qty: Number(i.qty),
          unit: i.unit,
          estimated_unit_cost: i.estimated_unit_cost
            ? Number(i.estimated_unit_cost)
            : null,
          notes: i.notes,
        })),
      );
    }
  }, [existingItems]);

  // Lookups
  const [costCenters, setCostCenters] = useState<
    { id: string; name: string }[]
  >([]);
  const [products, setProducts] = useState<
    {
      id: string;
      name: string;
      sku: string | null;
      cost_price: number | null;
    }[]
  >([]);
  const [serviceCalls, setServiceCalls] = useState<
    { id: string; service_order_number: string; description: string | null }[]
  >([]);
  const [equipmentList, setEquipmentList] = useState<
    { id: string; name: string; model: string | null }[]
  >([]);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>(
    [],
  );

  useEffect(() => {
    supabase
      .from("cost_centers")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setCostCenters(data);
      });
    supabase
      .from("products")
      .select("id, name, sku, cost_price")
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data);
      });
    supabase
      .from("service_calls")
      .select("id, service_order_number, description")
      .in("status", ["open", "in_progress"])
      .order("service_order_number", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setServiceCalls(data);
      });
    supabase
      .from("equipment")
      .select("id, name, model")
      .order("name")
      .then(({ data }) => {
        if (data) setEquipmentList(data);
      });
    supabase
      .from("clients")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, []);

  const addItemRow = () => {
    setItems([
      ...items,
      {
        product_id: null,
        description: "",
        qty: 1,
        unit: "UN",
        estimated_unit_cost: null,
        notes: null,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof ItemLocal, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;

    // Auto-fill description and cost from product
    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[idx].description = product.name;
        updated[idx].estimated_unit_cost = product.cost_price;
      }
    }

    setItems(updated);
  };

  const handleSave = async () => {
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && existingRequest) {
        // Update existing request
        const { error } = await supabase
          .from("purchase_requests")
          .update({
            client_id: form.client_id || null,
            service_call_id: form.service_call_id || null,
            equipment_id: form.equipment_id || null,
            cost_center_id: form.cost_center_id || null,
            priority: form.priority,
            notes: form.notes || null,
          })
          .eq("id", id);
        if (error) throw error;

        // Sync items: remove deleted, update existing, add new
        const existingIds = items.filter((i) => i.id).map((i) => i.id!);
        const toRemove = existingItems.filter(
          (ei) => !existingIds.includes(ei.id),
        );
        for (const r of toRemove) {
          await removeItem.mutateAsync(r.id);
        }

        for (const item of validItems) {
          if (item.id) {
            await updateItem.mutateAsync({
              id: item.id,
              product_id: item.product_id || null,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              estimated_unit_cost: item.estimated_unit_cost,
              notes: item.notes,
            });
          } else {
            await addItem.mutateAsync({
              request_id: id!,
              product_id: item.product_id || null,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              estimated_unit_cost: item.estimated_unit_cost,
              notes: item.notes,
            });
          }
        }

        toast.success("Solicitação atualizada!");
      } else {
        // Create new
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) throw new Error("Usuário não autenticado");

        const result = await createRequest.mutateAsync({
          client_id: form.client_id || null,
          service_call_id: form.service_call_id || null,
          equipment_id: form.equipment_id || null,
          cost_center_id: form.cost_center_id || null,
          priority: form.priority as any,
          notes: form.notes || null,
          requested_by: userId,
        });

        // Add items
        for (const item of validItems) {
          await addItem.mutateAsync({
            request_id: result.id,
            product_id: item.product_id || null,
            description: item.description,
            qty: item.qty,
            unit: item.unit,
            estimated_unit_cost: item.estimated_unit_cost,
            notes: item.notes,
          });
        }
      }

      navigate("/compras/solicitacoes");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar solicitação");
    } finally {
      setSaving(false);
    }
  };

  const totalEstimated = items.reduce(
    (sum, i) => sum + i.qty * (i.estimated_unit_cost || 0),
    0,
  );

  if (isEdit && loadingRequest) {
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
            onClick={() => navigate("/compras/solicitacoes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? `Solicitação #${existingRequest?.request_number}`
              : "Nova Solicitação de Compra"}
          </h1>
        </div>

        {/* Dados gerais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados Gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordem de Serviço</Label>
              <Select
                value={form.service_call_id}
                onValueChange={(v) => setForm({ ...form, service_call_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCalls.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      OS #{sc.service_order_number}
                      {sc.description
                        ? ` — ${sc.description.substring(0, 40)}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipamento</Label>
              <Select
                value={form.equipment_id}
                onValueChange={(v) => setForm({ ...form, equipment_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentList.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}
                      {eq.model ? ` (${eq.model})` : ""}
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
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Itens */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens</CardTitle>
            <Button size="sm" variant="outline" onClick={addItemRow}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Item
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
                    <TableHead className="w-32">Custo Est.</TableHead>
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
                          placeholder="Descrição do item"
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
                          value={item.estimated_unit_cost ?? ""}
                          onChange={(e) =>
                            updateItemRow(
                              idx,
                              "estimated_unit_cost",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          placeholder="R$"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(
                          item.qty * (item.estimated_unit_cost || 0)
                        ).toLocaleString("pt-BR", {
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
            <div className="flex justify-end mt-3">
              <div className="text-lg font-semibold">
                Total Estimado:{" "}
                {totalEstimated.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/compras/solicitacoes")}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
