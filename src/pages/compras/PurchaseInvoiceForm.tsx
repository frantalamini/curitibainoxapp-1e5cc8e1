import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import {
  Save,
  ArrowLeft,
  Package,
  Truck,
  CreditCard,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { usePurchaseInvoices } from "@/hooks/usePurchaseInvoices";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceItem {
  id: string;
  item_number: number;
  product_code: string | null;
  ean: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_total: number;
  product?: { id: string; name: string } | null;
}

interface SupplierDetail {
  id: string;
  full_name: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  state_registration: string | null;
  phone: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
}

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "outline" },
  VALIDATED: { label: "Validada", variant: "secondary" },
  BOOKED: { label: "Escriturada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
};

export default function PurchaseInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { createInvoice, updateInvoice } = usePurchaseInvoices();

  const [form, setForm] = useState({
    invoice_number: "",
    invoice_series: "1",
    invoice_key: "",
    supplier_id: "",
    order_id: "",
    receipt_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    subtotal: "",
    freight: "0",
    insurance: "0",
    other_costs: "0",
    discount: "0",
    total: "",
    icms_base: "0",
    icms_value: "0",
    ipi_value: "0",
    pis_value: "0",
    cofins_value: "0",
    nature_operation: "",
    notes: "",
  });

  // Extra fields (read-only from import)
  const [extra, setExtra] = useState({
    status: "PENDING",
    emission_time: "",
    entry_date: "",
    entry_time: "",
    finality: "",
    tax_regime: "",
    icms_st_base: 0,
    icms_st_value: 0,
    tax_total_approx: 0,
    items_count: 0,
    freight_mode: "",
    carrier_name: "",
    carrier_cnpj: "",
    volumes_qty: 0,
    volumes_species: "",
    gross_weight: 0,
    net_weight: 0,
    payment_terms: "",
    protocol_number: "",
    sefaz_status: "",
    info_fisco: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [supplierDetail, setSupplierDetail] = useState<SupplierDetail | null>(
    null,
  );
  const [orders, setOrders] = useState<
    { id: string; order_number: number; supplier_id: string }[]
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
      .from("purchase_orders")
      .select("id, order_number, supplier_id")
      .in("status", ["SENT", "PARTIAL", "RECEIVED"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setOrders(data);
      });
  }, []);

  // Load invoice data
  useEffect(() => {
    if (!id) return;

    supabase
      .from("purchase_invoices")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          invoice_number: data.invoice_number,
          invoice_series: data.invoice_series || "1",
          invoice_key: data.invoice_key || "",
          supplier_id: data.supplier_id,
          order_id: data.order_id || "",
          receipt_id: data.receipt_id || "",
          issue_date: data.issue_date,
          subtotal: data.subtotal?.toString() || "",
          freight: data.freight?.toString() || "0",
          insurance: data.insurance?.toString() || "0",
          other_costs: data.other_costs?.toString() || "0",
          discount: data.discount?.toString() || "0",
          total: data.total?.toString() || "",
          icms_base: data.icms_base?.toString() || "0",
          icms_value: data.icms_value?.toString() || "0",
          ipi_value: data.ipi_value?.toString() || "0",
          pis_value: data.pis_value?.toString() || "0",
          cofins_value: data.cofins_value?.toString() || "0",
          nature_operation: (data as any).nature_operation || "",
          notes: data.notes || "",
        });
        setExtra({
          status: data.status || "PENDING",
          emission_time: data.emission_time || "",
          entry_date: data.entry_date || "",
          entry_time: data.entry_time || "",
          finality: data.finality || "",
          tax_regime: data.tax_regime || "",
          icms_st_base: data.icms_st_base || 0,
          icms_st_value: data.icms_st_value || 0,
          tax_total_approx: data.tax_total_approx || 0,
          items_count: data.items_count || 0,
          freight_mode: data.freight_mode || "",
          carrier_name: data.carrier_name || "",
          carrier_cnpj: data.carrier_cnpj || "",
          volumes_qty: data.volumes_qty || 0,
          volumes_species: data.volumes_species || "",
          gross_weight: data.gross_weight || 0,
          net_weight: data.net_weight || 0,
          payment_terms: data.payment_terms || "",
          protocol_number: data.protocol_number || "",
          sefaz_status: data.sefaz_status || "",
          info_fisco: data.info_fisco || "",
        });
      });

    // Load items
    supabase
      .from("purchase_invoice_items")
      .select("*, product:products(id, name)")
      .eq("invoice_id", id)
      .order("item_number")
      .then(({ data }) => {
        if (data) setItems(data as InvoiceItem[]);
      });
  }, [id]);

  // Load supplier detail
  useEffect(() => {
    if (!form.supplier_id) {
      setSupplierDetail(null);
      return;
    }
    supabase
      .from("clients")
      .select(
        "id, full_name, nome_fantasia, cpf_cnpj, state_registration, phone, street, number, neighborhood, city, state, cep",
      )
      .eq("id", form.supplier_id)
      .single()
      .then(({ data }) => {
        if (data) setSupplierDetail(data as SupplierDetail);
      });
  }, [form.supplier_id]);

  const handleOrderChange = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    setForm((f) => ({
      ...f,
      order_id: orderId,
      supplier_id: order?.supplier_id || f.supplier_id,
    }));
  };

  const calcTotal = () => {
    const sub = Number(form.subtotal) || 0;
    const frt = Number(form.freight) || 0;
    const ins = Number(form.insurance) || 0;
    const oth = Number(form.other_costs) || 0;
    const disc = Number(form.discount) || 0;
    return sub + frt + ins + oth - disc;
  };

  useEffect(() => {
    const t = calcTotal();
    if (t > 0) setForm((f) => ({ ...f, total: t.toFixed(2) }));
  }, [
    form.subtotal,
    form.freight,
    form.insurance,
    form.other_costs,
    form.discount,
  ]);

  const handleSave = async () => {
    if (!form.invoice_number) {
      toast.error("Informe o número da NF");
      return;
    }
    if (!form.supplier_id) {
      toast.error("Selecione o fornecedor");
      return;
    }
    if (!form.issue_date) {
      toast.error("Informe a data de emissão");
      return;
    }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const payload = {
        invoice_number: form.invoice_number,
        invoice_series: form.invoice_series,
        invoice_key: form.invoice_key || null,
        supplier_id: form.supplier_id,
        order_id: form.order_id || null,
        receipt_id: form.receipt_id || null,
        issue_date: form.issue_date,
        subtotal: Number(form.subtotal) || 0,
        freight: Number(form.freight) || 0,
        insurance: Number(form.insurance) || 0,
        other_costs: Number(form.other_costs) || 0,
        discount: Number(form.discount) || 0,
        total: Number(form.total) || 0,
        icms_base: Number(form.icms_base) || 0,
        icms_value: Number(form.icms_value) || 0,
        ipi_value: Number(form.ipi_value) || 0,
        pis_value: Number(form.pis_value) || 0,
        cofins_value: Number(form.cofins_value) || 0,
        nature_operation: form.nature_operation || null,
        notes: form.notes || null,
        created_by: session.session?.user.id || null,
      };

      if (isEdit) {
        await updateInvoice.mutateAsync({ id: id!, ...payload });
      } else {
        await createInvoice.mutateAsync(payload);
      }
      navigate("/compras/notas-entrada");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar NF");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const statusInfo = STATUS_LABELS[extra.status] || STATUS_LABELS.PENDING;

  return (
    <MainLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/compras/notas-entrada")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isEdit ? `NF ${form.invoice_number}` : "Nova NF de Entrada"}
            </h1>
            {isEdit && (
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            )}
          </div>
        </div>

        {/* Protocolo SEFAZ */}
        {isEdit && extra.protocol_number && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <strong>Protocolo SEFAZ:</strong> {extra.protocol_number} —{" "}
            {extra.sefaz_status}
          </div>
        )}

        {/* Dados da Nota */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Dados da Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <Label>Número da NF *</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) =>
                  setForm({ ...form, invoice_number: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Série</Label>
              <Input
                value={form.invoice_series}
                onChange={(e) =>
                  setForm({ ...form, invoice_series: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Data Emissão *</Label>
              <Input
                type="date"
                value={form.issue_date}
                onChange={(e) =>
                  setForm({ ...form, issue_date: e.target.value })
                }
              />
            </div>
            {extra.emission_time && (
              <div>
                <Label>Hora Emissão</Label>
                <Input
                  value={extra.emission_time}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}
            <div className="col-span-2">
              <Label>Chave NFe (44 dígitos)</Label>
              <Input
                value={form.invoice_key}
                onChange={(e) =>
                  setForm({ ...form, invoice_key: e.target.value })
                }
                maxLength={44}
                className="font-mono text-xs"
              />
            </div>
            <div className="col-span-2">
              <Label>Natureza da Operação</Label>
              <Input
                value={form.nature_operation}
                onChange={(e) =>
                  setForm({ ...form, nature_operation: e.target.value })
                }
                placeholder="Ex: Venda de Mercadoria"
              />
            </div>
            {extra.finality && (
              <div>
                <Label>Finalidade</Label>
                <Input value={extra.finality} readOnly className="bg-muted" />
              </div>
            )}
            {extra.tax_regime && (
              <div>
                <Label>Regime Tributário</Label>
                <Input value={extra.tax_regime} readOnly className="bg-muted" />
              </div>
            )}
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
              <Label>Pedido de Compra</Label>
              <Select value={form.order_id} onValueChange={handleOrderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      #{o.order_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fornecedor - Detalhes */}
        {supplierDetail && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Remetente / Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg mb-3">
                {supplierDetail.full_name}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">CNPJ:</span>{" "}
                  <span className="font-medium">
                    {supplierDetail.cpf_cnpj || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IE:</span>{" "}
                  <span className="font-medium">
                    {supplierDetail.state_registration || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>{" "}
                  <span className="font-medium">
                    {supplierDetail.phone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cidade/UF:</span>{" "}
                  <span className="font-medium">
                    {supplierDetail.city || "—"}/{supplierDetail.state || "—"}
                  </span>
                </div>
                {supplierDetail.street && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Endereço:</span>{" "}
                    <span className="font-medium">
                      {supplierDetail.street}, {supplierDetail.number} -{" "}
                      {supplierDetail.neighborhood}
                    </span>
                  </div>
                )}
                {supplierDetail.cep && (
                  <div>
                    <span className="text-muted-foreground">CEP:</span>{" "}
                    <span className="font-medium">{supplierDetail.cep}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Produtos / Itens */}
        {items.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" /> Produtos ({items.length}{" "}
                {items.length === 1 ? "item" : "itens"})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Nº</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="w-16">Un</TableHead>
                    <TableHead className="text-right w-20">Qtde</TableHead>
                    <TableHead className="text-right w-28">Preço Un.</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_number}</TableCell>
                      <TableCell className="font-medium">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {item.product_code || item.ean || "—"}
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {fmt(item.quantity)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {fmt(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {fmt(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Valores */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle>Valores</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Subtotal *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.subtotal}
                onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
              />
            </div>
            <div>
              <Label>Frete</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.freight}
                onChange={(e) => setForm({ ...form, freight: e.target.value })}
              />
            </div>
            <div>
              <Label>Seguro</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.insurance}
                onChange={(e) =>
                  setForm({ ...form, insurance: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Outras Desp.</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.other_costs}
                onChange={(e) =>
                  setForm({ ...form, other_costs: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Desconto</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
            <div>
              <Label>Total</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                className="font-bold"
              />
            </div>
          </CardContent>
        </Card>

        {/* Impostos */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle>Impostos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <Label>Base ICMS</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.icms_base}
                onChange={(e) =>
                  setForm({ ...form, icms_base: e.target.value })
                }
              />
            </div>
            <div>
              <Label>ICMS</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.icms_value}
                onChange={(e) =>
                  setForm({ ...form, icms_value: e.target.value })
                }
              />
            </div>
            {extra.icms_st_base > 0 && (
              <div>
                <Label>Base ICMS ST</Label>
                <Input
                  value={fmt(extra.icms_st_base)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}
            {extra.icms_st_value > 0 && (
              <div>
                <Label>ICMS ST</Label>
                <Input
                  value={fmt(extra.icms_st_value)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}
            <div>
              <Label>IPI</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.ipi_value}
                onChange={(e) =>
                  setForm({ ...form, ipi_value: e.target.value })
                }
              />
            </div>
            <div>
              <Label>PIS</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.pis_value}
                onChange={(e) =>
                  setForm({ ...form, pis_value: e.target.value })
                }
              />
            </div>
            <div>
              <Label>COFINS</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.cofins_value}
                onChange={(e) =>
                  setForm({ ...form, cofins_value: e.target.value })
                }
              />
            </div>
            {extra.tax_total_approx > 0 && (
              <div className="col-span-2 md:col-span-1">
                <Label>Tributos Aprox.</Label>
                <Input
                  value={`R$ ${fmt(extra.tax_total_approx)}`}
                  readOnly
                  className="bg-muted font-medium"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transportador */}
        {extra.freight_mode && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Transportador / Volumes
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label>Frete por conta</Label>
                <p className="font-medium">{extra.freight_mode}</p>
              </div>
              {extra.carrier_name && (
                <div>
                  <Label>Transportadora</Label>
                  <p className="font-medium">{extra.carrier_name}</p>
                </div>
              )}
              {extra.carrier_cnpj && (
                <div>
                  <Label>CNPJ</Label>
                  <p className="font-medium">{extra.carrier_cnpj}</p>
                </div>
              )}
              {extra.volumes_qty > 0 && (
                <div>
                  <Label>Volumes</Label>
                  <p className="font-medium">
                    {extra.volumes_qty} {extra.volumes_species || ""}
                  </p>
                </div>
              )}
              {extra.gross_weight > 0 && (
                <div>
                  <Label>Peso Bruto</Label>
                  <p className="font-medium">{fmt(extra.gross_weight)} kg</p>
                </div>
              )}
              {extra.net_weight > 0 && (
                <div>
                  <Label>Peso Líquido</Label>
                  <p className="font-medium">{fmt(extra.net_weight)} kg</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagamento */}
        {extra.payment_terms && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Condição de Pagamento</Label>
                <p className="font-medium text-lg">{extra.payment_terms}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            {extra.info_fisco && (
              <div>
                <Label>Informações ao Fisco</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {extra.info_fisco}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/compras/notas-entrada")}
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
