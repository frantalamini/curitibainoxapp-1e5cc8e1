import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ClientAsyncSelect } from "@/components/ClientAsyncSelect";
import { useSale, useSales, SaleInsert, SaleUpdate } from "@/hooks/useSales";
import { useSaleItems, SaleItemInsert } from "@/hooks/useSaleItems";
import { useProducts } from "@/hooks/useProducts";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Trash2, Plus, Search, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface LocalItem {
  id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount_type: string;
  discount_value: number;
  total: number;
  isNew?: boolean;
}

export default function SaleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingSale, isLoading: loadingSale } = useSale(id);
  const { items: existingItems, isLoading: loadingItems } = useSaleItems(id);
  const { createSale, updateSale } = useSales();
  const { products } = useProducts();
  const currentUserProfile = useCurrentUserProfile();

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [quoteValidUntil, setQuoteValidUntil] = useState<Date>(addDays(new Date(), 15));
  const [discountType, setDiscountType] = useState<"value" | "percent">("value");
  const [discountValue, setDiscountValue] = useState(0);
  const [commissionPercent, setCommissionPercent] = useState(0);

  // Items state
  const [items, setItems] = useState<LocalItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Load existing data
  useEffect(() => {
    if (existingSale) {
      setClientId(existingSale.client_id);
      setNotes(existingSale.notes || "");
      setDiscountType(existingSale.discount_type as "value" | "percent" || "value");
      setDiscountValue(existingSale.discount_value || 0);
      setCommissionPercent(existingSale.commission_percent || 0);
      if (existingSale.quote_valid_until) {
        setQuoteValidUntil(new Date(existingSale.quote_valid_until));
      }
    }
  }, [existingSale]);

  useEffect(() => {
    if (existingItems?.length) {
      setItems(
        existingItems.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          total: item.total,
        }))
      );
    }
  }, [existingItems]);

  // Filtered products for search
  const filteredProducts = products.filter(
    (p) =>
      p.active &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Add product to items
  const addProduct = (product: typeof products[0]) => {
    const newItem: LocalItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      description: product.name,
      qty: 1,
      unit_price: product.sale_price || 0,
      discount_type: "value",
      discount_value: 0,
      total: product.sale_price || 0,
      isNew: true,
    };
    setItems([...items, newItem]);
    setProductSearch("");
    setShowProductSearch(false);
  };

  // Add manual item
  const addManualItem = () => {
    const newItem: LocalItem = {
      id: crypto.randomUUID(),
      product_id: null,
      description: "",
      qty: 1,
      unit_price: 0,
      discount_type: "value",
      discount_value: 0,
      total: 0,
      isNew: true,
    };
    setItems([...items, newItem]);
  };

  // Update item
  const updateItem = (id: string, updates: Partial<LocalItem>) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // Recalculate total
        let itemTotal = updated.qty * updated.unit_price;
        if (updated.discount_type === "percent") {
          itemTotal -= itemTotal * (updated.discount_value / 100);
        } else {
          itemTotal -= updated.discount_value;
        }
        return { ...updated, total: Math.max(0, itemTotal) };
      })
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  let finalDiscount = 0;
  if (discountType === "percent") {
    finalDiscount = subtotal * (discountValue / 100);
  } else {
    finalDiscount = Math.min(discountValue, subtotal);
  }
  const total = subtotal - finalDiscount;
  const commissionValue = total * (commissionPercent / 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Save sale
  const handleSave = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (isEditing && id) {
        // Update existing sale
        const updateData: SaleUpdate = {
          id,
          client_id: clientId,
          subtotal,
          discount_type: discountType,
          discount_value: discountValue,
          total,
          commission_percent: commissionPercent,
          commission_value: commissionValue,
          notes: notes || null,
          quote_valid_until: format(quoteValidUntil, "yyyy-MM-dd"),
        };

        await updateSale.mutateAsync(updateData);

        // Delete existing items and recreate
        await supabase.from("sale_items").delete().eq("sale_id", id);

        // Insert new items
        const itemsToInsert: SaleItemInsert[] = items.map((item) => ({
          sale_id: id,
          product_id: item.product_id,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          total: item.total,
        }));

        const { error: itemsError } = await supabase.from("sale_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast.success("Orçamento atualizado!");
        navigate("/vendas");
      } else {
        // Create new sale
        const saleData: SaleInsert = {
          client_id: clientId,
          seller_id: user.id,
          subtotal,
          discount_type: discountType,
          discount_value: discountValue,
          total,
          commission_percent: commissionPercent,
          commission_value: commissionValue,
          notes: notes || null,
          quote_valid_until: format(quoteValidUntil, "yyyy-MM-dd"),
          created_by: user.id,
        };

        const result = await createSale.mutateAsync(saleData);

        // Insert items
        const itemsToInsert: SaleItemInsert[] = items.map((item) => ({
          sale_id: result.id,
          product_id: item.product_id,
          description: item.description,
          qty: item.qty,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          total: item.total,
        }));

        const { error: itemsError } = await supabase.from("sale_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;

        navigate("/vendas");
      }
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Erro ao salvar orçamento");
    }
  };

  if (isEditing && (loadingSale || loadingItems)) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title={isEditing ? `Orçamento #${existingSale?.sale_number}` : "Novo Orçamento"}
          showBackButton
          backTo="/vendas"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientAsyncSelect
                  value={clientId}
                  onChange={setClientId}
                  onNewClientClick={() => navigate("/cadastros/novo")}
                />
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens</CardTitle>
                <div className="flex gap-2">
                  <Popover open={showProductSearch} onOpenChange={setShowProductSearch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Produto
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-2">
                        <Input
                          placeholder="Nome ou SKU do produto..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          autoFocus
                        />
                        <div className="max-h-48 overflow-auto space-y-1">
                          {filteredProducts.slice(0, 10).map((product) => (
                            <div
                              key={product.id}
                              className="p-2 hover:bg-muted rounded-md cursor-pointer text-sm"
                              onClick={() => addProduct(product)}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-muted-foreground text-xs flex justify-between">
                                <span>{product.sku || "Sem SKU"}</span>
                                <span>{formatCurrency(product.sale_price || 0)}</span>
                              </div>
                            </div>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="text-center text-muted-foreground py-4 text-sm">
                              Nenhum produto encontrado
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="sm" onClick={addManualItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Item Manual
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[80px]">Qtd</TableHead>
                        <TableHead className="w-[120px]">Preço Un.</TableHead>
                        <TableHead className="w-[100px]">Desc.</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhum item adicionado. Use os botões acima para adicionar produtos.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                placeholder="Descrição do item"
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={1}
                                className="h-8 w-16"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.01}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.discount_value}
                                onChange={(e) => updateItem(item.id, { discount_value: parseFloat(e.target.value) || 0 })}
                                min={0}
                                step={0.01}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações internas ou condições comerciais..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Totals */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Valid Until */}
                <div className="space-y-2">
                  <Label>Validade do Orçamento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal")}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(quoteValidUntil, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={quoteValidUntil}
                        onSelect={(date) => date && setQuoteValidUntil(date)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <Label className="text-sm">Desconto Geral</Label>
                  <div className="flex gap-2">
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as "value" | "percent")}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">R$</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      min={0}
                      step={discountType === "percent" ? 1 : 0.01}
                      className="flex-1"
                    />
                  </div>
                  {finalDiscount > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                      -{formatCurrency(finalDiscount)}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>

                <Separator />

                {/* Commission */}
                <div className="space-y-2">
                  <Label className="text-sm">Comissão do Vendedor (%)</Label>
                  <Input
                    type="number"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={0.5}
                  />
                  {commissionValue > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                      = {formatCurrency(commissionValue)}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Save Button */}
                <Button className="w-full" size="lg" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Salvar Alterações" : "Criar Orçamento"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
