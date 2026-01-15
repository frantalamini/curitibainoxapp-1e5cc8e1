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
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { OSPaymentEntry, PaymentMethodType } from "./types";
import { cn } from "@/lib/utils";

interface PaymentMethodsSectionProps {
  total: number;
  methods: OSPaymentEntry[];
  onMethodsChange: (methods: OSPaymentEntry[]) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const methodLabels: Record<PaymentMethodType, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  boleto: "Boleto",
  transferencia: "Transferência",
  outros: "Outros",
};

export const PaymentMethodsSection = ({
  total,
  methods,
  onMethodsChange,
}: PaymentMethodsSectionProps) => {
  const handleAddMethod = () => {
    const newMethod: OSPaymentEntry = {
      id: crypto.randomUUID(),
      method: "pix",
      amount: methods.length === 0 ? total : 0,
      details: "",
    };
    onMethodsChange([...methods, newMethod]);
  };

  const handleRemoveMethod = (id: string) => {
    onMethodsChange(methods.filter(m => m.id !== id));
  };

  const handleMethodChange = (
    id: string,
    field: keyof OSPaymentEntry,
    value: string | number
  ) => {
    onMethodsChange(
      methods.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  // Calculate validation
  const methodsTotal = methods.reduce((sum, m) => sum + m.amount, 0);
  const difference = total - methodsTotal;
  const isValid = Math.abs(difference) < 0.01;

  // Auto-fill remaining amount for last method
  const handleAutoFill = (id: string) => {
    const otherMethodsTotal = methods
      .filter(m => m.id !== id)
      .reduce((sum, m) => sum + m.amount, 0);
    
    const remaining = total - otherMethodsTotal;
    handleMethodChange(id, 'amount', Math.max(0, remaining));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Formas de Pagamento
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMethod}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhuma forma de pagamento adicionada.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddMethod}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar primeira forma
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method, index) => (
              <div
                key={method.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div>
                  <Label className="text-xs">Forma</Label>
                  <Select
                    value={method.method}
                    onValueChange={(v) => handleMethodChange(method.id, 'method', v as PaymentMethodType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(methodLabels) as PaymentMethodType[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {methodLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={method.amount}
                      onChange={(e) => handleMethodChange(method.id, 'amount', Number(e.target.value))}
                    />
                    {methods.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Preencher restante"
                        onClick={() => handleAutoFill(method.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Detalhes (opcional)</Label>
                  <Input
                    placeholder="Chave PIX, banco, etc."
                    value={method.details || ""}
                    onChange={(e) => handleMethodChange(method.id, 'details', e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMethod(method.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Validation message */}
        {methods.length > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg",
              isValid
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-destructive/10 border border-destructive/30"
            )}
          >
            {isValid ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  Formas de pagamento conferem com o total
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Diferença: {formatCurrency(difference)} {difference > 0 ? '(falta)' : '(excede)'}
                </span>
              </>
            )}
            <div className="ml-auto text-sm">
              <span className="text-muted-foreground">Soma: </span>
              <span className="font-semibold">{formatCurrency(methodsTotal)}</span>
              <span className="text-muted-foreground"> / Total: </span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
