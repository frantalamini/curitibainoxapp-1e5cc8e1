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
import { format, addDays, parse, isValid } from "date-fns";
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
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuickProductForm } from "./QuickProductForm";
import { DiscountType, PaymentMode } from "./types";
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

// Format date input as dd/mm/yyyy
const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

// Parse dd/mm/yyyy to Date
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr || dateStr.length < 10) return null;
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
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
    createTransaction,
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

  // === NEW: Formas de Pagamento - Lista simples ===
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);

  // === NEW: Condição de Pagamento ===
  const [installmentCount, setInstallmentCount] = useState(1);
  const [startDateInput, setStartDateInput] = useState(format(new Date(), "dd/MM/yyyy"));
  const [installmentInterval, setInstallmentInterval] = useState(30);
  
  // Confirm dialog for regenerating
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // === NEW: Inline editing state for installments ===
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editAmount, setEditAmount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDays, setEditDays] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);

  // Load existing data from service call
  useEffect(() => {
    if (serviceCall) {
      const sc = serviceCall as Record<string, any>;
      setOsDiscountType((sc.discount_total_type as DiscountType) || "value");
      setOsDiscountValue(sc.discount_total_value || 0);

      const paymentConfig = parsePaymentConfig(sc.payment_config);
      if (paymentConfig) {
        if (paymentConfig.startDate) {
          const d = new Date(paymentConfig.startDate + "T12:00:00");
          setStartDateInput(format(d, "dd/MM/yyyy"));
        }
        if (paymentConfig.allowedPaymentMethods && paymentConfig.allowedPaymentMethods.length > 0) {
          setSelectedPaymentMethods(paymentConfig.allowedPaymentMethods);
        }
        if (paymentConfig.installmentDays && paymentConfig.installmentDays.length > 0) {
          setInstallmentCount(paymentConfig.installmentDays.length);
          // Infer interval from days array
          if (paymentConfig.installmentDays.length > 1) {
            setInstallmentInterval(paymentConfig.installmentDays[1] - paymentConfig.installmentDays[0]);
          }
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

  // Calculate totals difference
  const totalInstallments = transactions.reduce((sum, t) => sum + t.amount, 0);
  const diferenca = Math.abs(grandTotal - totalInstallments);
  const hasDiferenca = diferenca > 0.01 && transactions.length > 0;

  // Parse start date
  const paymentStartDate = useMemo(() => {
    return parseDateString(startDateInput) || new Date();
  }, [startDateInput]);

  // Check if can generate
  const canGenerate = startDateInput.length === 10 && parseDateString(startDateInput) !== null && grandTotal > 0;

  // Calculate item total with discount
  const calculateItemTotal = (qty: number, unitPrice: number, discountType: "percent" | "value", discountPercent: number, discountValue: number) => {
    const subtotal = qty * unitPrice;
    if (discountType === "percent") {
      return subtotal - (subtotal * discountPercent / 100);
    }
    return subtotal - discountValue;
  };

  // === Payment Methods Handlers ===
  const handleAddPaymentMethod = () => {
    setSelectedPaymentMethods(prev => [...prev, '']);
  };

  const handleRemovePaymentMethod = (index: number) => {
    setSelectedPaymentMethods(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangePaymentMethod = (index: number, value: string) => {
    setSelectedPaymentMethods(prev => {
      const newMethods = [...prev];
      newMethods[index] = value;
      return newMethods;
    });
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
        discount_type: newProduct.discount_type,
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
        discount_type: newService.discount_type,
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

  // === Generate Installments ===
  const handleGenerateInstallments = async () => {
    if (grandTotal <= 0) {
      toast({ title: "O valor total deve ser maior que zero", variant: "destructive" });
      return;
    }

    // Check if there are existing transactions - show confirm dialog
    if (transactions.length > 0) {
      setShowRegenerateConfirm(true);
      return;
    }

    await doGenerateInstallments();
  };

  const doGenerateInstallments = async () => {
    // Clear existing first
    if (transactions.length > 0) {
      for (const t of transactions) {
        await deleteTransaction.mutateAsync(t.id);
      }
    }

    const groupId = crypto.randomUUID();
    const installmentDays = Array.from({ length: installmentCount }, (_, i) => installmentInterval * i);
    
    // Default payment method from selected list
    const defaultMethod = selectedPaymentMethods.length > 0 ? selectedPaymentMethods[0] : null;
    
    // Generate installments
    const installmentsData = installmentDays.map((days, i) => {
      const dueDate = addDays(paymentStartDate, days);
      const amount = i === installmentCount - 1 
        ? grandTotal - (Math.floor((grandTotal / installmentCount) * 100) / 100) * (installmentCount - 1)
        : Math.floor((grandTotal / installmentCount) * 100) / 100;
      
      return {
        direction: "RECEIVE" as const,
        origin: "SERVICE_CALL" as const,
        status: "OPEN" as const,
        service_call_id: serviceCallId,
        client_id: clientId,
        due_date: format(dueDate, "yyyy-MM-dd"),
        amount,
        payment_method: defaultMethod,
        installment_number: i + 1,
        installments_total: installmentCount,
        installments_group_id: groupId,
        notes: null,
      };
    });

    try {
      await createManyTransactions.mutateAsync(installmentsData);
      toast({ title: "Parcelas geradas com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao gerar parcelas", variant: "destructive" });
    }
  };

  // === Clear all installments ===
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

  // === Add manual installment ===
  const handleAddInstallment = async () => {
    const lastInstallment = transactions[transactions.length - 1];
    const newInstallmentNumber = (lastInstallment?.installment_number || 0) + 1;
    const newDueDate = lastInstallment 
      ? addDays(new Date(lastInstallment.due_date + "T12:00:00"), installmentInterval)
      : new Date();

    try {
      await createTransaction.mutateAsync({
        direction: "RECEIVE",
        origin: "SERVICE_CALL",
        status: "OPEN",
        service_call_id: serviceCallId,
        client_id: clientId,
        due_date: format(newDueDate, "yyyy-MM-dd"),
        amount: 0,
        payment_method: selectedPaymentMethods[0] || null,
        installment_number: newInstallmentNumber,
        installments_total: transactions.length + 1,
        installments_group_id: lastInstallment?.installments_group_id || crypto.randomUUID(),
        notes: null,
      });
      toast({ title: "Parcela adicionada" });
    } catch (error) {
      toast({ title: "Erro ao adicionar parcela", variant: "destructive" });
    }
  };

  // === Inline edit handlers ===
  const handleStartEditTransaction = (t: any, index: number) => {
    setEditingTransactionId(t.id);
    setEditDueDate(new Date(t.due_date + "T12:00:00"));
    setEditAmount(t.amount);
    setEditPaymentMethod(t.payment_method || '');
    setEditNotes(t.notes || '');
    // Calculate days from first transaction
    const days = transactions.length > 0 && index > 0
      ? Math.round((new Date(t.due_date + "T12:00:00").getTime() - new Date(transactions[0].due_date + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    setEditDays(days);
  };

  // When days change, recalculate due date
  const handleDaysChange = (newDays: number) => {
    setEditDays(newDays);
    if (transactions.length > 0) {
      const firstDate = new Date(transactions[0].due_date + "T12:00:00");
      const newDueDate = addDays(firstDate, newDays);
      setEditDueDate(newDueDate);
    }
  };

  const handleSaveEditTransaction = async () => {
    if (!editingTransactionId || !editDueDate) return;
    
    if (!editAmount || editAmount <= 0) {
      toast({ title: "O valor deve ser maior que zero", variant: "destructive" });
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id: editingTransactionId,
        amount: editAmount,
        due_date: format(editDueDate, "yyyy-MM-dd"),
        payment_method: editPaymentMethod || null,
        notes: editNotes || null,
      });
      setEditingTransactionId(null);
      toast({ title: "Parcela atualizada" });
    } catch (error) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
  };

  // === Update payment method for a single transaction (inline select) ===
  const handleUpdateTransactionPaymentMethod = async (transactionId: string, method: string) => {
    try {
      await updateTransaction.mutateAsync({
        id: transactionId,
        payment_method: method,
      });
    } catch (error) {
      toast({ title: "Erro ao atualizar forma de pagamento", variant: "destructive" });
    }
  };

  // === Calculate days from first installment ===
  const calculateDays = (t: any, index: number): number => {
    if (transactions.length === 0) return 0;
    const firstDate = new Date(transactions[0].due_date + "T12:00:00");
    const currentDate = new Date(t.due_date + "T12:00:00");
    return Math.round((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // === Save financial data ===
  const handleSaveFinancial = async () => {
    // Validate parcels before saving
    const invalidParcels = transactions.filter(t => !t.due_date || t.amount <= 0);
    if (invalidParcels.length > 0) {
      toast({ title: "Todas as parcelas devem ter data e valor válidos", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update installments_total for consistency on all transactions
      const currentTotal = transactions.length;
      for (const t of transactions) {
        if (t.installments_total !== currentTotal) {
          await updateTransaction.mutateAsync({
            id: t.id,
            installments_total: currentTotal,
          });
        }
      }

      // 2. Build and save payment config to the service call
      const installmentDays = Array.from({ length: installmentCount }, (_, i) => installmentInterval * i);
      const paymentConfig = buildPaymentConfig(
        paymentStartDate, 
        installmentDays, 
        'multiple',
        undefined,
        selectedPaymentMethods.filter(m => m)
      );

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

      // 3. Force invalidate receivables cache to ensure sync
      // Note: This is already done automatically via updateTransaction.onSuccess,
      // but we call it again here for explicit clarity and safety
      // The cache invalidation happens in the hook mutations automatically

      toast({ title: "Contas a receber atualizadas" });
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
    <div className="space-y-4 w-full min-w-0 max-w-full">
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
                    <TableHead className="py-1 px-1">Item</TableHead>
                    <TableHead className="py-1 px-1 text-right w-10">Qtd</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16">Unit.</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16 hidden lg:table-cell">Subtot.</TableHead>
                    <TableHead className="py-1 px-1 text-right w-12">%Desc</TableHead>
                    <TableHead className="py-1 px-1 text-right w-14">R$Desc</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16">Total</TableHead>
                    <TableHead className="py-1 px-1 w-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productItems.map(item => {
                    const subtotal = item.qty * item.unit_price;
                    const discountPercent = item.discount_type === "percent" && subtotal > 0 
                      ? Math.round((item.discount_value / subtotal) * 100) 
                      : 0;
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="py-1 px-1">
                          <span className="font-medium truncate block max-w-[150px]" title={item.description}>{item.description}</span>
                          {item.products?.sku && (
                            <span className="text-muted-foreground text-[10px]">({item.products.sku})</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-right">{item.qty}</TableCell>
                        <TableCell className="py-1 px-1 text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="py-1 px-1 text-right text-muted-foreground hidden lg:table-cell">{formatCurrency(subtotal)}</TableCell>
                        <TableCell className="py-1 px-1 text-right text-destructive">
                          {item.discount_type === "percent" && item.discount_value > 0 
                            ? `-${discountPercent}%` 
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-right text-destructive">
                          {item.discount_type === "value" && item.discount_value > 0 
                            ? `-${formatCurrency(item.discount_value)}` 
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="py-1 px-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteItem(item.id)}>
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 pt-2 border-t text-xs">
            <div className="col-span-2">
              <Label className="text-[10px]">Produto</Label>
              <div className="flex gap-1">
                <Select value={newProduct.product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger className="h-7 text-xs">
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
              <Input type="number" min="1" className="h-7 text-xs" value={newProduct.qty}
                onChange={e => setNewProduct(prev => ({ ...prev, qty: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">Unit.</Label>
              <Input type="number" step="0.01" min="0" className="h-7 text-xs" value={newProduct.unit_price}
                onChange={e => setNewProduct(prev => ({ ...prev, unit_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-[10px]">%Desc</Label>
              <Input type="number" min="0" max="100" className="h-7 text-xs" 
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
              <Input type="number" step="0.01" min="0" className="h-7 text-xs" 
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
              <Button type="button" size="sm" className="h-7 w-8 text-xs" onClick={handleAddProduct} disabled={createItem.isPending}>
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
                    <TableHead className="py-1 px-1">Descrição</TableHead>
                    <TableHead className="py-1 px-1 text-right w-10">Qtd</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16">Unit.</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16 hidden lg:table-cell">Subtot.</TableHead>
                    <TableHead className="py-1 px-1 text-right w-12">%Desc</TableHead>
                    <TableHead className="py-1 px-1 text-right w-14">R$Desc</TableHead>
                    <TableHead className="py-1 px-1 text-right w-16">Total</TableHead>
                    <TableHead className="py-1 px-1 w-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceItems.map(item => {
                    const subtotal = item.qty * item.unit_price;
                    const discountPercent = item.discount_type === "percent" && subtotal > 0 
                      ? Math.round((item.discount_value / subtotal) * 100) 
                      : 0;
                    return (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="py-1 px-1 font-medium truncate max-w-[150px]" title={item.description}>{item.description}</TableCell>
                        <TableCell className="py-1 px-1 text-right">{item.qty}</TableCell>
                        <TableCell className="py-1 px-1 text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="py-1 px-1 text-right text-muted-foreground hidden lg:table-cell">{formatCurrency(subtotal)}</TableCell>
                        <TableCell className="py-1 px-1 text-right text-destructive">
                          {item.discount_type === "percent" && item.discount_value > 0 
                            ? `-${discountPercent}%` 
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-right text-destructive">
                          {item.discount_type === "value" && item.discount_value > 0 
                            ? `-${formatCurrency(item.discount_value)}` 
                            : "-"}
                        </TableCell>
                        <TableCell className="py-1 px-1 text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="py-1 px-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteItem(item.id)}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 pt-2 border-t text-xs">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end text-sm">
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

      {/* === UNIFIED: Condição de Pagamento (Formas + Parcelas Config) === */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Condição de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {/* Formas de Pagamento Aceitas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground font-medium">Formas de Pagamento Aceitas</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleAddPaymentMethod}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPaymentMethods.length === 0 && (
                <span className="text-xs text-muted-foreground italic">Nenhuma forma selecionada</span>
              )}
              {selectedPaymentMethods.map((method, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Select value={method} onValueChange={(v) => handleChangePaymentMethod(index, v)}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activePaymentMethods.map(pm => (
                        <SelectItem key={pm.id} value={pm.name} className="text-xs">
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemovePaymentMethod(index)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Linha separadora */}
          <div className="border-t" />

          {/* Condição de Pagamento - Menu Horizontal */}
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <div className="min-w-[80px]">
              <Label className="text-[10px]">Condição</Label>
              <Select value={String(installmentCount)} onValueChange={(v) => setInstallmentCount(Number(v))}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[110px]">
              <Label className="text-[10px]">Data Início 1ª Parcela</Label>
              <Input 
                type="text" 
                placeholder="dd/mm/aaaa" 
                className="h-8 text-xs mt-1"
                value={startDateInput}
                onChange={e => setStartDateInput(formatDateInput(e.target.value))}
                maxLength={10}
              />
            </div>
            <div className="min-w-[80px]">
              <Label className="text-[10px]">Intervalo (dias)</Label>
              <Input 
                type="number" 
                min="1" 
                className="h-8 text-xs mt-1" 
                value={installmentInterval}
                onChange={e => setInstallmentInterval(Number(e.target.value) || 30)} 
              />
            </div>
            <Button 
              type="button" 
              className="h-8 text-xs px-4" 
              onClick={handleGenerateInstallments}
              disabled={!canGenerate || createManyTransactions.isPending}
            >
              <Receipt className="h-3 w-3 mr-1" />
              {createManyTransactions.isPending ? "Gerando..." : "GERAR PARCELAS"}
            </Button>
            {transactions.length > 0 && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleClearInstallments}>
                <Trash className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === Parcelas Geradas - Tabela com todas as colunas === */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Parcelas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma parcela gerada. Use o botão "GERAR PARCELAS" acima.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-1 px-1 w-10">Nº</TableHead>
                      <TableHead className="py-1 px-1 w-10 text-right">Dias</TableHead>
                      <TableHead className="py-1 px-1 w-20">Data</TableHead>
                      <TableHead className="py-1 px-1 w-16 text-right">Valor</TableHead>
                      <TableHead className="py-1 px-1 w-20">Forma</TableHead>
                      <TableHead className="py-1 px-1">Obs</TableHead>
                      <TableHead className="py-1 px-1 w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, index) => {
                      const isEditing = editingTransactionId === t.id;
                      const days = calculateDays(t, index);
                      
                      return (
                        <TableRow key={t.id} className={cn("text-xs", isEditing && "bg-muted/50")}>
                          {/* Nº */}
                          <TableCell className="py-1 px-2 font-medium">
                            {t.installments_total && t.installments_total > 1 
                              ? `${t.installment_number}/${t.installments_total}` 
                              : "1x"}
                          </TableCell>
                          
                          {/* Dias - Editável */}
                          <TableCell className="py-1 px-2 text-right">
                            {isEditing ? (
                              <Input 
                                type="number" 
                                min="0" 
                                className="h-7 text-xs w-16 text-right"
                                value={editDays} 
                                onChange={e => handleDaysChange(Number(e.target.value))} 
                              />
                            ) : (
                              <span 
                                className={cn("text-muted-foreground", t.status === "OPEN" && "cursor-pointer hover:underline")}
                                onClick={() => t.status === "OPEN" && handleStartEditTransaction(t, index)}
                              >
                                {days}
                              </span>
                            )}
                          </TableCell>
                          
                          {/* Data */}
                          <TableCell className="py-1 px-2">
                            {isEditing ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-start">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {editDueDate ? format(editDueDate, "dd/MM/yyyy") : "-"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar 
                                    mode="single" 
                                    selected={editDueDate} 
                                    onSelect={setEditDueDate} 
                                    locale={ptBR}
                                    className="pointer-events-auto" 
                                  />
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span 
                                className={cn(t.status === "OPEN" && "cursor-pointer hover:underline")}
                                onClick={() => t.status === "OPEN" && handleStartEditTransaction(t, index)}
                              >
                                {format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy")}
                              </span>
                            )}
                          </TableCell>
                          
                          {/* Valor */}
                          <TableCell className="py-1 px-2 text-right">
                            {isEditing ? (
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                className="h-7 text-xs w-full text-right"
                                value={editAmount} 
                                onChange={e => setEditAmount(Number(e.target.value))} 
                              />
                            ) : (
                              <span 
                                className={cn("font-medium", t.status === "OPEN" && "cursor-pointer hover:underline")}
                                onClick={() => t.status === "OPEN" && handleStartEditTransaction(t, index)}
                              >
                                {formatCurrency(t.amount)}
                              </span>
                            )}
                          </TableCell>
                          
                          {/* Forma */}
                          <TableCell className="py-1 px-2">
                            {isEditing ? (
                              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activePaymentMethods.map(pm => (
                                    <SelectItem key={pm.id} value={pm.name} className="text-xs">
                                      {pm.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : t.status === "OPEN" ? (
                              <Select 
                                value={t.payment_method || ''} 
                                onValueChange={(v) => handleUpdateTransactionPaymentMethod(t.id, v)}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activePaymentMethods.map(pm => (
                                    <SelectItem key={pm.id} value={pm.name} className="text-xs">
                                      {pm.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs">{t.payment_method || "-"}</span>
                            )}
                          </TableCell>
                          
                          {/* Observação */}
                          <TableCell className="py-1 px-2">
                            {isEditing ? (
                              <Input 
                                type="text" 
                                placeholder="Observação..."
                                className="h-7 text-xs w-full"
                                value={editNotes} 
                                onChange={e => setEditNotes(e.target.value)} 
                              />
                            ) : (
                              <span 
                                className={cn("text-muted-foreground", t.status === "OPEN" && "cursor-pointer hover:underline")}
                                onClick={() => t.status === "OPEN" && handleStartEditTransaction(t, index)}
                              >
                                {t.notes || "-"}
                              </span>
                            )}
                          </TableCell>
                          
                          {/* Ações */}
                          <TableCell className="py-1 px-2">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveEditTransaction}>
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
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
                              <div className="flex items-center gap-1">
                                {t.status === "PAID" && <Badge className="bg-green-500 text-[10px]">Pago</Badge>}
                                {t.status === "CANCELED" && <Badge variant="destructive" className="text-[10px]">Canc.</Badge>}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Adicionar parcela - Link abaixo da tabela */}
              <div className="py-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-primary hover:text-primary/80 px-0" 
                  onClick={handleAddInstallment}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  + adicionar outra parcela
                </Button>
              </div>
              
              {/* Summary */}
              <div className="flex flex-wrap justify-between items-center gap-4 pt-3 border-t text-xs">
                <div className="flex gap-4">
                  <span>Total Parcelas: <strong>{formatCurrency(totalInstallments)}</strong></span>
                  <span>Pago: <strong className="text-green-600">{formatCurrency(summary.paid)}</strong></span>
                  <span>Aberto: <strong className="text-orange-600">{formatCurrency(summary.open)}</strong></span>
                </div>
                
                {/* Diferença warning */}
                {hasDiferenca && (
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Diferença: {formatCurrency(diferenca)} (Total OS: {formatCurrency(grandTotal)})</span>
                  </div>
                )}
                {!hasDiferenca && transactions.length > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Valores conferem</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={handleSaveFinancial} disabled={isSaving} className="min-w-[160px]">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Financeiro"}
        </Button>
      </div>

      {/* Confirm Regenerate Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Parcelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existem parcelas geradas. Deseja limpar e gerar novas parcelas com as configurações atuais?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowRegenerateConfirm(false); doGenerateInstallments(); }}>
              Limpar e Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
