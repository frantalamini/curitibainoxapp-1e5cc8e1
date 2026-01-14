import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent, DollarSign } from "lucide-react";
import { DiscountConfig, DiscountType, CalculatedTotals } from "./types";

interface DiscountSectionProps {
  subtotalParts: number;
  subtotalServices: number;
  discounts: DiscountConfig;
  onDiscountsChange: (discounts: DiscountConfig) => void;
  calculatedTotals: CalculatedTotals;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const DiscountSection = ({
  subtotalParts,
  subtotalServices,
  discounts,
  onDiscountsChange,
  calculatedTotals,
}: DiscountSectionProps) => {
  const handleDiscountChange = (
    category: 'parts' | 'services' | 'total',
    field: 'type' | 'value',
    newValue: DiscountType | number
  ) => {
    const updated = { ...discounts };
    if (field === 'type') {
      updated[category] = { ...updated[category], type: newValue as DiscountType };
    } else {
      // Validate value
      let value = newValue as number;
      if (updated[category].type === 'percent') {
        value = Math.min(100, Math.max(0, value));
      }
      updated[category] = { ...updated[category], value };
    }
    onDiscountsChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Descontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discount on Parts */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end pb-3 border-b">
          <div>
            <Label className="text-xs text-muted-foreground">Subtotal Peças</Label>
            <p className="text-lg font-semibold">{formatCurrency(subtotalParts)}</p>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select
              value={discounts.parts.type}
              onValueChange={(v) => handleDiscountChange('parts', 'type', v as DiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Percentual
                  </span>
                </SelectItem>
                <SelectItem value="value">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor {discounts.parts.type === 'percent' ? '(%)' : '(R$)'}</Label>
            <Input
              type="number"
              step={discounts.parts.type === 'percent' ? '1' : '0.01'}
              min="0"
              max={discounts.parts.type === 'percent' ? '100' : subtotalParts}
              value={discounts.parts.value}
              onChange={(e) => handleDiscountChange('parts', 'value', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Desconto Calculado</Label>
            <p className="text-lg font-medium text-destructive">
              -{formatCurrency(calculatedTotals.discountParts)}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total Peças</Label>
            <p className="text-lg font-bold">{formatCurrency(calculatedTotals.totalParts)}</p>
          </div>
        </div>

        {/* Discount on Services */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end pb-3 border-b">
          <div>
            <Label className="text-xs text-muted-foreground">Subtotal Serviços</Label>
            <p className="text-lg font-semibold">{formatCurrency(subtotalServices)}</p>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select
              value={discounts.services.type}
              onValueChange={(v) => handleDiscountChange('services', 'type', v as DiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Percentual
                  </span>
                </SelectItem>
                <SelectItem value="value">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor {discounts.services.type === 'percent' ? '(%)' : '(R$)'}</Label>
            <Input
              type="number"
              step={discounts.services.type === 'percent' ? '1' : '0.01'}
              min="0"
              max={discounts.services.type === 'percent' ? '100' : subtotalServices}
              value={discounts.services.value}
              onChange={(e) => handleDiscountChange('services', 'value', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Desconto Calculado</Label>
            <p className="text-lg font-medium text-destructive">
              -{formatCurrency(calculatedTotals.discountServices)}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total Serviços</Label>
            <p className="text-lg font-bold">{formatCurrency(calculatedTotals.totalServices)}</p>
          </div>
        </div>

        {/* Total OS Discount */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-muted/50 p-3 rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Subtotal OS</Label>
            <p className="text-lg font-semibold">
              {formatCurrency(calculatedTotals.totalParts + calculatedTotals.totalServices)}
            </p>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select
              value={discounts.total.type}
              onValueChange={(v) => handleDiscountChange('total', 'type', v as DiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" /> Percentual
                  </span>
                </SelectItem>
                <SelectItem value="value">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Valor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valor {discounts.total.type === 'percent' ? '(%)' : '(R$)'}</Label>
            <Input
              type="number"
              step={discounts.total.type === 'percent' ? '1' : '0.01'}
              min="0"
              max={discounts.total.type === 'percent' ? '100' : undefined}
              value={discounts.total.value}
              onChange={(e) => handleDiscountChange('total', 'value', Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Desconto OS</Label>
            <p className="text-lg font-medium text-destructive">
              -{formatCurrency(calculatedTotals.discountTotal)}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">TOTAL OS</Label>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(calculatedTotals.grandTotal)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
