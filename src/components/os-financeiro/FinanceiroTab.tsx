import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useServiceCallItems, ItemType, ServiceCallItem } from "@/hooks/useServiceCallItems";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useServiceCall } from "@/hooks/useServiceCalls";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { 
  useFinancialCalculations, 
  generateInstallments, 
  prepareWebhookPayload,
  buildPaymentConfig,
  parsePaymentConfig
} from "@/hooks/useFinancialCalculations";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package,
  Wrench,
  Trash2,
  Plus,
  Save,
  Percent,
  DollarSign,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  X,
  Calendar as CalendarIcon,
  Check,
  ListOrdered,
  Trash,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuickProductForm } from "./QuickProductForm";
import { DiscountConfig, PaymentMethod, DiscountType } from "./types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FinanceiroTabProps {
  serviceCallId: string;
  clientId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const FinanceiroTab = ({ serviceCallId, clientId }: FinanceiroTabProps) => {
  const { toast } = useToast();
  const { products } = useProducts();
  const { activePaymentMethods } = usePaymentMethods();
  const { data: serviceCall } = useServiceCall(serviceCallId);
  const {
    items,
    productItems,
    serviceItems,
    createItem,
    updateItem,
    deleteItem,
    totals,
    isLoading: isLoadingItems,
  } = useServiceCallItems(serviceCallId);
  
  const {
    transactions,
    createManyTransactions,
    updateTransaction,
    markAsPaid,
    cancelTransaction,
    deleteTransaction,
    summary,
    isLoading: isLoadingTransactions,
  } = useFinancialTransactions(serviceCallId);

  // Form states for adding items
  const [newProduct, setNewProduct] = useState({
    product_id: "",
    qty: 1,
    unit_price: 0,
    discount_percent: 0,
    discount_value: 0,
    discount_type: "value" as "percent" | "value",
  });

  const [newService, setNewService] = useState({
    description: "",
    qty: 1,
    unit_price: 0,
    discount_percent: 0,
    discount_value: 0,
    discount_type: "value" as "percent" | "value",
  });

  // Simplified discount - only OS general discount
  const [osDiscountType, setOsDiscountType] = useState<DiscountType>("value");
  const [osDiscountValue, setOsDiscountValue] = useState(0);

  // Payment states
  const [paymentStartDate, setPaymentStartDate] = useState<Date>(new Date());
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installmentInterval, setInstallmentInterval] = useState(30);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Editing state for inline installment editing
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDays, setEditDays] = useState(0);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editAmount, setEditAmount] = useState(0);

  // Load existing data from service call
  useEffect(() => {
    if (serviceCall) {
      const sc = serviceCall as Record<string, any>;
      setOsDiscountType((sc.discount_total_type as DiscountType) || "value");
      setOsDiscountValue(sc.discount_total_value || 0);

      const paymentConfig = parsePaymentConfig(sc.payment_config);
      if (paymentConfig) {
        if (paymentConfig.startDate) {
          setPaymentStartDate(new Date(paymentConfig.startDate + "T12:00:00"));
        }
        if (paymentConfig.paymentMethods.length > 0) {
          setPaymentMethods(paymentConfig.paymentMethods);
        }
      }
    }
  }, [serviceCall]);

  // Calculate totals
  const subtotalParts = totals.products;
  const subtotalServices = totals.services;
  const subtotalOS = subtotalParts + subtotalServices;
  
  const osDiscount = useMemo(() => {
    if (osDiscountType === "percent") {
      return (subtotalOS * osDiscountValue) / 100;
    }
    return Math.min(osDiscountValue, subtotalOS);
  }, [osDiscountType, osDiscountValue, subtotalOS]);
  
  const grandTotal = subtotalOS - osDiscount;

  // Generate installment days array
  const installmentDays = useMemo(() => {
    return Array.from({ length: installmentCount }, (_, i) => installmentInterval * (i + 1));
  }, [installmentCount, installmentInterval]);

  // Calculate item total with discount
  const calculateItemTotal = (qty: number, unitPrice: number, discountType: "percent" | "value", discountPercent: number, discountValue: number) => {
    const subtotal = qty * unitPrice;
    if (discountType === "percent") {
      return subtotal - (subtotal * discountPercent / 100);
    }
    return subtotal - discountValue;
  };

  // Add product item
  const handleAddProduct = async () => {
    if (!newProduct.product_id) {
      toast({ title: "Selecione um produto", variant: "destructive" });
      return;
    }

    const product = products.find(p => p.id === newProduct.product_id);
    if (!product) return;

    const qty = newProduct.qty || 1;
    const unitPrice = newProduct.unit_price || product.unit_price || 0;
    const discountVal = newProduct.discount_type === "percent" 
      ? (qty * unitPrice * newProduct.discount_percent / 100)
      : newProduct.discount_value;
    const total = qty * unitPrice - discountVal;

    try {
      await createItem.mutateAsync({
        service_call_id: serviceCallId,
        type: "PRODUCT" as ItemType,
        product_id: newProduct.product_id,
        description: product.name,
        qty,
        unit_price: unitPrice,
        discount_value: discountVal,
        total,
      });

      setNewProduct({ product_id: "", qty: 1, unit_price: 0, discount_percent: 0, discount_value: 0, discount_type: "value" });
      toast({ title: "Peça adicionada" });
    } catch (error) {
      toast({ title: "Erro ao adicionar peça", variant: "destructive" });
    }
  };

  // Add service item
  const handleAddService = async () => {
    if (!newService.description.trim()) {
      toast({ title: "Digite uma descrição", variant: "destructive" });
      return;
    }

    const qty = newService.qty || 1;
    const unitPrice = newService.unit_price || 0;
    const discountVal = newService.discount_type === "percent" 
      ? (qty * unitPrice * newService.discount_percent / 100)
      : newService.discount_value;
    const total = qty * unitPrice - discountVal;

    try {
      await createItem.mutateAsync({
        service_call_id: serviceCallId,
        type: "SERVICE" as ItemType,
        description: newService.description,
        qty,
        unit_price: unitPrice,
        discount_value: discountVal,
        total,
      });

      setNewService({ description: "", qty: 1, unit_price: 0, discount_percent: 0, discount_value: 0, discount_type: "value" });
      toast({ title: "Serviço adicionado" });
    } catch (error) {
      toast({ title: "Erro ao adicionar serviço", variant: "destructive" });
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast({ title: "Item removido" });
    } catch (error) {
      toast({ title: "Erro ao remover item", variant: "destructive" });
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setNewProduct(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.unit_price || 0,
    }));
  };

  // Payment methods handlers
  const handleAddPaymentMethod = () => {
    const defaultMethod = activePaymentMethods[0]?.name || "PIX";
    const newMethod: PaymentMethod = {
      id: crypto.randomUUID(),
      method: defaultMethod.toLowerCase().replace(/\s+/g, "_") as any,
      amount: paymentMethods.length === 0 ? grandTotal : 0,
      details: "",
    };
    setPaymentMethods([...paymentMethods, newMethod]);
  };

  const handleRemovePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
  };

  const handlePaymentMethodChange = (id: string, field: keyof PaymentMethod, value: any) => {
    setPaymentMethods(paymentMethods.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const paymentMethodsTotal = paymentMethods.reduce((sum, m) => sum + m.amount, 0);
  const paymentMethodsDiff = grandTotal - paymentMethodsTotal;
  const paymentMethodsValid = Math.abs(paymentMethodsDiff) < 0.01;

  // Generate installments
  const handleGenerateInstallments = async () => {
    if (grandTotal <= 0) {
      toast({ title: "O valor total deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (transactions.length > 0) {
      toast({ title: "Limpe as parcelas existentes primeiro", variant: "destructive" });
      return;
    }

    const groupId = crypto.randomUUID();
    const installments = generateInstallments(paymentStartDate, installmentDays, grandTotal);
    const primaryMethod = paymentMethods.length > 0 ? paymentMethods[0].method : "pix";

    const installmentsData = installments.map((inst) => ({
      direction: "RECEIVE" as const,
      origin: "SERVICE_CALL" as const,
      status: "OPEN" as const,
      service_call_id: serviceCallId,
      client_id: clientId,
      due_date: format(inst.dueDate, "yyyy-MM-dd"),
      amount: inst.amount,
      payment_method: primaryMethod,
      installment_number: inst.number,
      installments_total: installments.length,
      installments_group_id: groupId,
      interval_days: inst.days,
    }));

    try {
      await createManyTransactions.mutateAsync(installmentsData);
      toast({ title: "Parcelas geradas com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao gerar parcelas", variant: "destructive" });
    }
  };

  // Clear all installments
  const handleClearInstallments = async () => {
    try {
      for (const t of transactions) {
        await deleteTransaction.mutateAsync(t.id);
      }
      toast({ title: "Parcelas removidas" });
    } catch (error) {
      toast({ title: "Erro ao remover parcelas", variant: "destructive" });
    }
  };

  // Inline edit handlers
  const handleStartEditTransaction = (t: any) => {
    setEditingTransactionId(t.id);
    setEditDays((t as any).interval_days || 0);
    setEditDueDate(new Date(t.due_date + "T12:00:00"));
    setEditAmount(t.amount);
  };

  const handleSaveEditTransaction = async () => {
    if (!editingTransactionId || !editDueDate) return;
    try {
      await updateTransaction.mutateAsync({
        id: editingTransactionId,
        amount: editAmount,
        due_date: format(editDueDate, "yyyy-MM-dd"),
      });
      setEditingTransactionId(null);
      toast({ title: "Parcela atualizada" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Save financial data
  const handleSaveFinancial = async () => {
    setIsSaving(true);
    try {
      const paymentConfig = buildPaymentConfig(paymentStartDate, installmentDays, paymentMethods);

      const { error } = await supabase
        .from("service_calls")
        .update({
          discount_parts_type: "value",
          discount_parts_value: 0,
          discount_services_type: "value",
          discount_services_value: 0,
          discount_total_type: osDiscountType,
          discount_total_value: osDiscountValue,
          payment_config: paymentConfig as unknown as Record<string, unknown>,
        } as any)
        .eq("id", serviceCallId);

      if (error) throw error;
      toast({ title: "Dados financeiros salvos" });
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingItems || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Peças/Produtos - Compact */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Peças / Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {productItems.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-1 px-2">Item</TableHead>
                    <TableHead className="py-1 px-2 text-right w-14">Qtd</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Unit.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Subtot.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-16">Desc.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Total</TableHead>
                    <TableHead className="py-1 px-2 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productItems.map(item => {
                    const subtotal = item.qty * item.unit_price;
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="py-1 px-2">
                          <span className="font-medium">{item.description}</span>
                          {item.products?.sku && (
                            <span className="text-muted-foreground ml-1">({item.products.sku})</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right">{item.qty}</TableCell>
                        <TableCell className="py-1 px-2 text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="py-1 px-2 text-right text-muted-foreground">{formatCurrency(subtotal)}</TableCell>
                        <TableCell className="py-1 px-2 text-right text-destructive">
                          {item.discount_value > 0 ? `-${formatCurrency(item.discount_value)}` : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="py-1 px-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Total Peças */}
          {productItems.length > 0 && (
            <div className="text-right text-sm font-medium py-1 border-t">
              Total Peças: {formatCurrency(subtotalParts)}
            </div>
          )}

          {/* Add product form - compact */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-1 pt-1 border-t text-xs">
            <div className="col-span-2">
              <Label className="text-[10px]">Produto</Label>
              <div className="flex gap-1">
                <Select value={newProduct.product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickProductForm onSuccess={(product) => handleProductSelect(product.id)} />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Qtd</Label>
              <Input type="number" min="1" className="h-8 text-xs" value={newProduct.qty}
                onChange={e => setNewProduct(prev => ({ ...prev, qty: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">Unit.</Label>
              <Input type="number" step="0.01" min="0" className="h-8 text-xs" value={newProduct.unit_price}
                onChange={e => setNewProduct(prev => ({ ...prev, unit_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">%Desc</Label>
              <Input type="number" min="0" max="100" className="h-8 text-xs" 
                value={newProduct.discount_type === "percent" ? newProduct.discount_percent : ""}
                placeholder="-"
                onChange={e => setNewProduct(prev => ({ 
                  ...prev, 
                  discount_type: "percent",
                  discount_percent: Number(e.target.value),
                  discount_value: 0
                }))} />
            </div>
            <div>
              <Label className="text-[10px]">R$Desc</Label>
              <Input type="number" step="0.01" min="0" className="h-8 text-xs" 
                value={newProduct.discount_type === "value" ? newProduct.discount_value : ""}
                placeholder="-"
                onChange={e => setNewProduct(prev => ({ 
                  ...prev, 
                  discount_type: "value",
                  discount_value: Number(e.target.value),
                  discount_percent: 0
                }))} />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" className="h-8 w-full text-xs" onClick={handleAddProduct} disabled={createItem.isPending}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços - Compact */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Serviços
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {serviceItems.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-1 px-2">Descrição</TableHead>
                    <TableHead className="py-1 px-2 text-right w-14">Qtd</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Unit.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Subtot.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-16">Desc.</TableHead>
                    <TableHead className="py-1 px-2 text-right w-20">Total</TableHead>
                    <TableHead className="py-1 px-2 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceItems.map(item => {
                    const subtotal = item.qty * item.unit_price;
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="py-1 px-2 font-medium">{item.description}</TableCell>
                        <TableCell className="py-1 px-2 text-right">{item.qty}</TableCell>
                        <TableCell className="py-1 px-2 text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="py-1 px-2 text-right text-muted-foreground">{formatCurrency(subtotal)}</TableCell>
                        <TableCell className="py-1 px-2 text-right text-destructive">
                          {item.discount_value > 0 ? `-${formatCurrency(item.discount_value)}` : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-2 text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="py-1 px-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Total Serviços */}
          {serviceItems.length > 0 && (
            <div className="text-right text-sm font-medium py-1 border-t">
              Total Serviços: {formatCurrency(subtotalServices)}
            </div>
          )}

          {/* Add service form - compact */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-1 pt-1 border-t text-xs">
            <div className="col-span-2">
              <Label className="text-[10px]">Descrição</Label>
              <Input placeholder="Ex: Mão de obra..." className="h-8 text-xs" value={newService.description}
                onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Qtd</Label>
              <Input type="number" min="1" className="h-8 text-xs" value={newService.qty}
                onChange={e => setNewService(prev => ({ ...prev, qty: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">Unit.</Label>
              <Input type="number" step="0.01" min="0" className="h-8 text-xs" value={newService.unit_price}
                onChange={e => setNewService(prev => ({ ...prev, unit_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">%Desc</Label>
              <Input type="number" min="0" max="100" className="h-8 text-xs"
                value={newService.discount_type === "percent" ? newService.discount_percent : ""}
                placeholder="-"
                onChange={e => setNewService(prev => ({ 
                  ...prev, 
                  discount_type: "percent",
                  discount_percent: Number(e.target.value),
                  discount_value: 0
                }))} />
            </div>
            <div>
              <Label className="text-[10px]">R$Desc</Label>
              <Input type="number" step="0.01" min="0" className="h-8 text-xs"
                value={newService.discount_type === "value" ? newService.discount_value : ""}
                placeholder="-"
                onChange={e => setNewService(prev => ({ 
                  ...prev, 
                  discount_type: "value",
                  discount_value: Number(e.target.value),
                  discount_percent: 0
                }))} />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" className="h-8 w-full text-xs" onClick={handleAddService} disabled={createItem.isPending}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totais e Desconto Geral - Compact */}
      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end text-sm">
            <div>
              <span className="text-[10px] text-muted-foreground">Total Peças</span>
              <p className="font-semibold">{formatCurrency(subtotalParts)}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Total Serviços</span>
              <p className="font-semibold">{formatCurrency(subtotalServices)}</p>
            </div>
            <div className="flex gap-1 items-end">
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground">Desc. OS</span>
                <div className="flex gap-1">
                  <Select value={osDiscountType} onValueChange={(v) => setOsDiscountType(v as DiscountType)}>
                    <SelectTrigger className="h-8 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent"><Percent className="h-3 w-3" /></SelectItem>
                      <SelectItem value="value"><DollarSign className="h-3 w-3" /></SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.01" min="0" className="h-8 text-xs w-20"
                    value={osDiscountValue} onChange={e => setOsDiscountValue(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Desconto Calculado</span>
              <p className="font-medium text-destructive">-{formatCurrency(osDiscount)}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">TOTAL OS</span>
              <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pagamento - Compact */}
      <Card>
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Formas de Pagamento
          </CardTitle>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddPaymentMethod}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {paymentMethods.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma forma adicionada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-1 px-2">Forma</TableHead>
                    <TableHead className="py-1 px-2 text-right">Valor</TableHead>
                    <TableHead className="py-1 px-2">Obs.</TableHead>
                    <TableHead className="py-1 px-2 w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethods.map(m => (
                    <TableRow key={m.id} className="text-xs">
                      <TableCell className="py-1 px-2">
                        <Select value={m.method} onValueChange={(v) => handlePaymentMethodChange(m.id, "method", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activePaymentMethods.map(pm => (
                              <SelectItem key={pm.id} value={pm.name.toLowerCase().replace(/\s+/g, "_")} className="text-xs">
                                {pm.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input type="number" step="0.01" min="0" className="h-7 text-xs w-24 text-right"
                          value={m.amount} onChange={e => handlePaymentMethodChange(m.id, "amount", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Input className="h-7 text-xs" placeholder="Chave PIX, etc."
                          value={m.details || ""} onChange={e => handlePaymentMethodChange(m.id, "details", e.target.value)} />
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePaymentMethod(m.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {paymentMethods.length > 0 && (
            <div className={cn(
              "flex items-center gap-2 p-2 rounded text-xs",
              paymentMethodsValid ? "bg-green-500/10" : "bg-yellow-500/10"
            )}>
              {paymentMethodsValid ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-600" />
              )}
              <span>Soma: {formatCurrency(paymentMethodsTotal)} / Total: {formatCurrency(grandTotal)}</span>
              {!paymentMethodsValid && <span className="text-yellow-700">Diferença: {formatCurrency(paymentMethodsDiff)}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condição de Pagamento (1-12x) - Compact */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Condição de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-2">
          {transactions.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded text-xs">
              <AlertCircle className="h-3 w-3 text-yellow-600" />
              <span>Já existem parcelas. Limpe antes de gerar novas.</span>
              <Button type="button" variant="outline" size="sm" className="h-6 text-xs ml-auto" onClick={handleClearInstallments}>
                <Trash className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div>
              <Label className="text-[10px]">Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-8 text-xs justify-start">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(paymentStartDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={paymentStartDate} onSelect={(d) => d && setPaymentStartDate(d)} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-[10px]">Qtd Parcelas</Label>
              <Select value={String(installmentCount)} onValueChange={(v) => setInstallmentCount(Number(v))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Intervalo (dias)</Label>
              <Input type="number" min="1" className="h-8 text-xs" value={installmentInterval}
                onChange={e => setInstallmentInterval(Number(e.target.value) || 30)} />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button type="button" className="h-8 w-full text-xs" onClick={handleGenerateInstallments}
                disabled={grandTotal <= 0 || transactions.length > 0 || createManyTransactions.isPending}>
                <Receipt className="h-3 w-3 mr-1" />
                {createManyTransactions.isPending ? "Gerando..." : `Gerar ${installmentCount}x`}
              </Button>
            </div>
          </div>
          
          {/* Preview */}
          {transactions.length === 0 && installmentCount > 0 && grandTotal > 0 && (
            <div className="bg-muted/50 rounded p-2 text-xs">
              <span className="text-muted-foreground">Prévia: </span>
              {installmentDays.map((days, i) => {
                const dueDate = addDays(paymentStartDate, days);
                return (
                  <Badge key={i} variant="secondary" className="mr-1 text-[10px]">
                    {i+1}/{installmentCount} - {format(dueDate, "dd/MM")} - {formatCurrency(grandTotal / installmentCount)}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parcelas Geradas - Compact with inline edit */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Parcelas Geradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-1 px-2 w-12">#</TableHead>
                    <TableHead className="py-1 px-2">Vencimento</TableHead>
                    <TableHead className="py-1 px-2 text-right">Valor</TableHead>
                    <TableHead className="py-1 px-2">Forma</TableHead>
                    <TableHead className="py-1 px-2">Status</TableHead>
                    <TableHead className="py-1 px-2">Pago em</TableHead>
                    <TableHead className="py-1 px-2 w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id} className={cn("text-xs", editingTransactionId === t.id && "bg-muted/50")}>
                      <TableCell className="py-1 px-2 font-medium">
                        {t.installments_total && t.installments_total > 1 ? `${t.installment_number}/${t.installments_total}` : "1x"}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        {editingTransactionId === t.id ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-xs w-28">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {editDueDate ? format(editDueDate, "dd/MM/yyyy") : "-"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} locale={ptBR} />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className={cn(t.status === "OPEN" && "cursor-pointer hover:underline")}
                            onClick={() => t.status === "OPEN" && handleStartEditTransaction(t)}>
                            {format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 px-2 text-right">
                        {editingTransactionId === t.id ? (
                          <Input type="number" step="0.01" min="0" className="h-7 text-xs w-20 text-right"
                            value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} />
                        ) : (
                          <span className={cn("font-medium", t.status === "OPEN" && "cursor-pointer hover:underline")}
                            onClick={() => t.status === "OPEN" && handleStartEditTransaction(t)}>
                            {formatCurrency(t.amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1 px-2">{t.payment_method || "-"}</TableCell>
                      <TableCell className="py-1 px-2">
                        {t.status === "PAID" && <Badge className="bg-green-500 text-[10px]">Pago</Badge>}
                        {t.status === "CANCELED" && <Badge variant="destructive" className="text-[10px]">Cancelado</Badge>}
                        {t.status === "OPEN" && <Badge variant="secondary" className="text-[10px]">Em Aberto</Badge>}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        {t.paid_at ? format(new Date(t.paid_at), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        {editingTransactionId === t.id ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveEditTransaction}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTransactionId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : t.status === "OPEN" ? (
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Pago" onClick={() => markAsPaid.mutateAsync(t.id)}>
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Cancelar" onClick={() => cancelTransaction.mutateAsync(t.id)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Excluir" onClick={() => deleteTransaction.mutateAsync(t.id)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Summary */}
            <div className="flex justify-end gap-4 pt-2 border-t text-xs">
              <span>Total: <strong>{formatCurrency(summary.total)}</strong></span>
              <span>Pago: <strong className="text-green-600">{formatCurrency(summary.paid)}</strong></span>
              <span>Aberto: <strong className="text-orange-600">{formatCurrency(summary.open)}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSaveFinancial} disabled={isSaving} className="min-w-[160px]">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Financeiro"}
        </Button>
      </div>
    </div>
  );
};
