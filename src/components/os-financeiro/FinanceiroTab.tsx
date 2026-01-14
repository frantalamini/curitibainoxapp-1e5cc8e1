import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useServiceCallItems, ItemType } from "@/hooks/useServiceCallItems";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { format, addDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Package,
  Wrench,
  Trash2,
  Plus,
  DollarSign,
  CreditCard,
  Check,
  X,
  Calculator,
  Receipt,
} from "lucide-react";
import { QuickProductForm } from "./QuickProductForm";

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
    markAsPaid,
    cancelTransaction,
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

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentCondition, setPaymentCondition] = useState("avista");
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [generalDiscount, setGeneralDiscount] = useState(0);

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

  // Generate installments
  const handleGenerateInstallments = async () => {
    const totalWithDiscount = totals.grand - generalDiscount;
    
    if (totalWithDiscount <= 0) {
      toast({ title: "O valor total deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (transactions.length > 0) {
      toast({ title: "Já existem parcelas geradas para esta OS", variant: "destructive" });
      return;
    }

    const groupId = crypto.randomUUID();
    const today = new Date();
    let installmentsData: any[] = [];

    if (paymentCondition === "avista") {
      // À vista - uma única parcela
      installmentsData = [{
        direction: "RECEIVE" as const,
        origin: "SERVICE_CALL" as const,
        status: "OPEN" as const,
        service_call_id: serviceCallId,
        client_id: clientId,
        due_date: format(today, "yyyy-MM-dd"),
        amount: totalWithDiscount,
        discount: generalDiscount,
        payment_method: paymentMethod,
        installment_number: 1,
        installments_total: 1,
        installments_group_id: groupId,
      }];
    } else if (paymentCondition === "parcelado") {
      // Parcelado - N parcelas mensais
      const installmentValue = totalWithDiscount / installmentsCount;
      
      for (let i = 0; i < installmentsCount; i++) {
        const dueDate = addMonths(today, i);
        installmentsData.push({
          direction: "RECEIVE" as const,
          origin: "SERVICE_CALL" as const,
          status: "OPEN" as const,
          service_call_id: serviceCallId,
          client_id: clientId,
          due_date: format(dueDate, "yyyy-MM-dd"),
          amount: installmentValue,
          discount: i === 0 ? generalDiscount : 0,
          payment_method: paymentMethod,
          installment_number: i + 1,
          installments_total: installmentsCount,
          installments_group_id: groupId,
        });
      }
    } else if (paymentCondition === "boleto30") {
      // Boleto 30 dias
      installmentsData = [{
        direction: "RECEIVE" as const,
        origin: "SERVICE_CALL" as const,
        status: "OPEN" as const,
        service_call_id: serviceCallId,
        client_id: clientId,
        due_date: format(addDays(today, 30), "yyyy-MM-dd"),
        amount: totalWithDiscount,
        discount: generalDiscount,
        payment_method: "boleto",
        installment_number: 1,
        installments_total: 1,
        installments_group_id: groupId,
      }];
    }

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

  // Handle product selection to update unit price
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setNewProduct(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.unit_price || 0,
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "CANCELED":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Em Aberto</Badge>;
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
                    <TableHead className="text-right">Desconto</TableHead>
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
              <Label className="text-xs">Desconto</Label>
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
                    <TableHead className="text-right">Desconto</TableHead>
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
              <Label className="text-xs">Desconto</Label>
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

      {/* Resumo */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Peças</Label>
              <p className="text-lg font-semibold">{formatCurrency(totals.products)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Serviços</Label>
              <p className="text-lg font-semibold">{formatCurrency(totals.services)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Desconto Geral</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={generalDiscount}
                onChange={e => setGeneralDiscount(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TOTAL OS</Label>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totals.grand - generalDiscount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagamento / Contas a Receber */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pagamento / Contas a Receber
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment configuration */}
          {transactions.length === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
              <div>
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Condição</Label>
                <Select value={paymentCondition} onValueChange={setPaymentCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avista">À Vista</SelectItem>
                    <SelectItem value="parcelado">Parcelado</SelectItem>
                    <SelectItem value="boleto30">Boleto 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentCondition === "parcelado" && (
                <div>
                  <Label className="text-xs">Nº Parcelas</Label>
                  <Select value={String(installmentsCount)} onValueChange={v => setInstallmentsCount(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-end">
                <Button 
                  type="button"
                  onClick={handleGenerateInstallments} 
                  disabled={createManyTransactions.isPending || totals.grand <= 0}
                  className="w-full"
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Gerar Parcelas
                </Button>
              </div>
            </div>
          )}

          {/* Installments list */}
          {transactions.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {t.installments_total && t.installments_total > 1
                          ? `${t.installment_number}/${t.installments_total}`
                          : "Única"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell>
                        {t.paid_at
                          ? format(new Date(t.paid_at), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {t.status === "OPEN" && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Marcar como pago"
                              onClick={() => handleMarkAsPaid(t.id)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Cancelar"
                              onClick={() => handleCancelTransaction(t.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {transactions.length > 0 && (
            <div className="flex justify-end gap-6 pt-4 border-t text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-semibold">{formatCurrency(summary.total)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pago:</span>{" "}
                <span className="font-semibold text-green-600">{formatCurrency(summary.paid)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Em Aberto:</span>{" "}
                <span className="font-semibold text-orange-600">{formatCurrency(summary.open)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
