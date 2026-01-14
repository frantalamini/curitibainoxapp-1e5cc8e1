import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useServiceCallItems, ItemType } from "@/hooks/useServiceCallItems";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useServiceCall } from "@/hooks/useServiceCalls";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuickProductForm } from "./QuickProductForm";
import { DiscountSection } from "./DiscountSection";
import { InstallmentGenerator } from "./InstallmentGenerator";
import { InstallmentTable } from "./InstallmentTable";
import { PaymentMethodsSection } from "./PaymentMethodsSection";
import { DiscountConfig, PaymentMethod, DiscountType } from "./types";

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
  const { data: serviceCall } = useServiceCall(serviceCallId);
  const {
    items,
    productItems,
    serviceItems,
    createItem,
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
    discount_value: 0,
  });

  const [newService, setNewService] = useState({
    description: "",
    qty: 1,
    unit_price: 0,
    discount_value: 0,
  });

  // === NEW: Discount states ===
  const [discounts, setDiscounts] = useState<DiscountConfig>({
    parts: { type: 'value', value: 0, calculated: 0 },
    services: { type: 'value', value: 0, calculated: 0 },
    total: { type: 'value', value: 0, calculated: 0 },
  });

  // === NEW: Payment states ===
  const [paymentStartDate, setPaymentStartDate] = useState<Date>(new Date());
  const [installmentDays, setInstallmentDays] = useState<number[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // === Load existing discount values from service call ===
  useEffect(() => {
    if (serviceCall) {
      const sc = serviceCall as Record<string, any>;
      
      // Load discounts
      setDiscounts({
        parts: {
          type: (sc.discount_parts_type as DiscountType) || 'value',
          value: sc.discount_parts_value || 0,
          calculated: 0,
        },
        services: {
          type: (sc.discount_services_type as DiscountType) || 'value',
          value: sc.discount_services_value || 0,
          calculated: 0,
        },
        total: {
          type: (sc.discount_total_type as DiscountType) || 'value',
          value: sc.discount_total_value || 0,
          calculated: 0,
        },
      });

      // Load payment config
      const paymentConfig = parsePaymentConfig(sc.payment_config);
      if (paymentConfig) {
        if (paymentConfig.startDate) {
          setPaymentStartDate(new Date(paymentConfig.startDate + "T12:00:00"));
        }
        if (paymentConfig.installmentDays.length > 0) {
          setInstallmentDays(paymentConfig.installmentDays);
        }
        if (paymentConfig.paymentMethods.length > 0) {
          setPaymentMethods(paymentConfig.paymentMethods);
        }
      }
    }
  }, [serviceCall]);

  // === Calculate totals with discounts ===
  const calculatedTotals = useFinancialCalculations({
    subtotalParts: totals.products,
    subtotalServices: totals.services,
    discounts,
  });

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
    const discount = newProduct.discount_value || 0;
    const total = qty * unitPrice - discount;

    try {
      await createItem.mutateAsync({
        service_call_id: serviceCallId,
        type: "PRODUCT" as ItemType,
        product_id: newProduct.product_id,
        description: product.name,
        qty,
        unit_price: unitPrice,
        discount_value: discount,
        total,
      });

      setNewProduct({ product_id: "", qty: 1, unit_price: 0, discount_value: 0 });
      toast({ title: "Peça adicionada com sucesso" });
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
    const discount = newService.discount_value || 0;
    const total = qty * unitPrice - discount;

    try {
      await createItem.mutateAsync({
        service_call_id: serviceCallId,
        type: "SERVICE" as ItemType,
        description: newService.description,
        qty,
        unit_price: unitPrice,
        discount_value: discount,
        total,
      });

      setNewService({ description: "", qty: 1, unit_price: 0, discount_value: 0 });
      toast({ title: "Serviço adicionado com sucesso" });
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

  // Handle product selection to update unit price
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setNewProduct(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.unit_price || 0,
    }));
  };

  // === NEW: Generate installments ===
  const handleGenerateInstallments = async () => {
    if (installmentDays.length === 0) {
      toast({ title: "Configure os dias das parcelas", variant: "destructive" });
      return;
    }

    if (calculatedTotals.grandTotal <= 0) {
      toast({ title: "O valor total deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (transactions.length > 0) {
      toast({ title: "Já existem parcelas geradas. Delete-as primeiro.", variant: "destructive" });
      return;
    }

    const groupId = crypto.randomUUID();
    const installments = generateInstallments(paymentStartDate, installmentDays, calculatedTotals.grandTotal);

    // Determine primary payment method
    const primaryMethod = paymentMethods.length > 0 ? paymentMethods[0].method : 'pix';

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
      console.error(error);
      toast({ title: "Erro ao gerar parcelas", variant: "destructive" });
    }
  };

  // Mark as paid
  const handleMarkAsPaid = async (transactionId: string) => {
    try {
      await markAsPaid.mutateAsync(transactionId);
      toast({ title: "Parcela marcada como paga" });
    } catch (error) {
      toast({ title: "Erro ao marcar como paga", variant: "destructive" });
    }
  };

  // Cancel transaction
  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await cancelTransaction.mutateAsync(transactionId);
      toast({ title: "Parcela cancelada" });
    } catch (error) {
      toast({ title: "Erro ao cancelar parcela", variant: "destructive" });
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync(transactionId);
      toast({ title: "Parcela excluída" });
    } catch (error) {
      toast({ title: "Erro ao excluir parcela", variant: "destructive" });
    }
  };

  // Update transaction
  const handleUpdateTransaction = async (id: string, updates: any) => {
    try {
      await updateTransaction.mutateAsync({ id, ...updates });
      toast({ title: "Parcela atualizada" });
    } catch (error) {
      toast({ title: "Erro ao atualizar parcela", variant: "destructive" });
    }
  };

  // === NEW: Save financial data ===
  const handleSaveFinancial = async () => {
    setIsSaving(true);
    try {
      // Build payment config JSON
      const paymentConfig = buildPaymentConfig(paymentStartDate, installmentDays, paymentMethods);

      // Update service call with discount and payment data
      const { error } = await supabase
        .from("service_calls")
        .update({
          discount_parts_type: discounts.parts.type,
          discount_parts_value: discounts.parts.value,
          discount_services_type: discounts.services.type,
          discount_services_value: discounts.services.value,
          discount_total_type: discounts.total.type,
          discount_total_value: discounts.total.value,
          payment_config: paymentConfig as unknown as Record<string, unknown>,
        } as any)
        .eq("id", serviceCallId);

      if (error) throw error;

      // Prepare webhook payload (for future integration)
      const webhookPayload = prepareWebhookPayload(
        serviceCallId,
        clientId,
        serviceCall?.os_number,
        discounts,
        calculatedTotals,
        { startDate: paymentStartDate, installmentDays },
        transactions.map(t => ({
          number: t.installment_number || 1,
          days: (t as any).interval_days || 0,
          dueDate: new Date(t.due_date + "T12:00:00"),
          amount: t.amount,
          status: t.status,
        })),
        paymentMethods
      );

      // Log webhook payload for debugging (future: send to webhook)
      console.log("[Webhook Payload]", webhookPayload);

      toast({ title: "Dados financeiros salvos com sucesso" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar dados financeiros", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingItems || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Peças/Produtos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5" />
            Peças / Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table of existing products */}
          {productItems.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Desc. Linha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.products?.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount_value)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add new product form */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t">
            <div className="col-span-2">
              <Label className="text-xs">Produto</Label>
              <div className="flex gap-2">
                <Select value={newProduct.product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickProductForm onSuccess={(product) => handleProductSelect(product.id)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Qtd</Label>
              <Input
                type="number"
                min="1"
                value={newProduct.qty}
                onChange={e => setNewProduct(prev => ({ ...prev, qty: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs">Preço Unit.</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newProduct.unit_price}
                onChange={e => setNewProduct(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs">Desc. Linha</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newProduct.discount_value}
                onChange={e => setNewProduct(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddProduct} disabled={createItem.isPending} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Serviços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table of existing services */}
          {serviceItems.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Desc. Linha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.discount_value)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add new service form */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t">
            <div className="col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input
                placeholder="Ex: Mão de obra..."
                value={newService.description}
                onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Qtd</Label>
              <Input
                type="number"
                min="1"
                value={newService.qty}
                onChange={e => setNewService(prev => ({ ...prev, qty: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs">Preço</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newService.unit_price}
                onChange={e => setNewService(prev => ({ ...prev, unit_price: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label className="text-xs">Desc. Linha</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newService.discount_value}
                onChange={e => setNewService(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddService} disabled={createItem.isPending} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === NEW: Discount Section === */}
      <DiscountSection
        subtotalParts={totals.products}
        subtotalServices={totals.services}
        discounts={discounts}
        onDiscountsChange={setDiscounts}
        calculatedTotals={calculatedTotals}
      />

      {/* === NEW: Payment Methods Section === */}
      <PaymentMethodsSection
        total={calculatedTotals.grandTotal}
        methods={paymentMethods}
        onMethodsChange={setPaymentMethods}
      />

      {/* === NEW: Installment Generator === */}
      <InstallmentGenerator
        total={calculatedTotals.grandTotal}
        startDate={paymentStartDate}
        onStartDateChange={setPaymentStartDate}
        installmentDays={installmentDays}
        onInstallmentDaysChange={setInstallmentDays}
        onGenerate={handleGenerateInstallments}
        hasExistingInstallments={transactions.length > 0}
        isGenerating={createManyTransactions.isPending}
      />

      {/* === NEW: Installment Table === */}
      {transactions.length > 0 && (
        <InstallmentTable
          transactions={transactions}
          onMarkAsPaid={handleMarkAsPaid}
          onCancel={handleCancelTransaction}
          onDelete={handleDeleteTransaction}
          onUpdate={handleUpdateTransaction}
          summary={summary}
          isUpdating={updateTransaction.isPending}
        />
      )}

      {/* === Save Button === */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleSaveFinancial}
          disabled={isSaving}
          className="min-w-[200px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Dados Financeiros"}
        </Button>
      </div>
    </div>
  );
};
