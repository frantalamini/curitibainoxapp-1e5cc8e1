import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, X, Receipt, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Installment } from "./types";

interface InstallmentGeneratorProps {
  total: number;
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  installmentDays: number[];
  onInstallmentDaysChange: (days: number[]) => void;
  onGenerate: () => void;
  hasExistingInstallments: boolean;
  isGenerating?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const InstallmentGenerator = ({
  total,
  startDate,
  onStartDateChange,
  installmentDays,
  onInstallmentDaysChange,
  onGenerate,
  hasExistingInstallments,
  isGenerating = false,
}: InstallmentGeneratorProps) => {
  const [daysInput, setDaysInput] = useState("");
  const [quickDaysMode, setQuickDaysMode] = useState<'custom' | 'preset'>('preset');

  // Quick presets
  const presets = [
    { label: "À Vista", days: [0] },
    { label: "30 dias", days: [30] },
    { label: "30/60", days: [30, 30] },
    { label: "30/60/90", days: [30, 30, 30] },
    { label: "7+14+21", days: [7, 7, 7] },
    { label: "15/30", days: [15, 15] },
  ];

  const handleAddDay = () => {
    const days = parseInt(daysInput);
    if (!isNaN(days) && days > 0) {
      onInstallmentDaysChange([...installmentDays, days]);
      setDaysInput("");
    }
  };

  const handleRemoveDay = (index: number) => {
    const updated = installmentDays.filter((_, i) => i !== index);
    onInstallmentDaysChange(updated);
  };

  const handlePresetSelect = (presetDays: number[]) => {
    onInstallmentDaysChange(presetDays);
  };

  const handleDaysInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDay();
    }
    if (e.key === '+') {
      e.preventDefault();
      handleAddDay();
    }
  };

  // Parse text input like "7+14+21"
  const handleTextInput = (text: string) => {
    const parsed = text
      .split(/[+,;/\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0);
    
    if (parsed.length > 0) {
      onInstallmentDaysChange(parsed);
    }
  };

  // Preview: calculate cumulative dates
  const previewInstallments = () => {
    if (installmentDays.length === 0) return [];
    
    const valuePerInstallment = total / installmentDays.length;
    let currentDate = new Date(startDate);
    
    return installmentDays.map((days, index) => {
      currentDate = addDays(currentDate, days);
      return {
        number: index + 1,
        days,
        dueDate: new Date(currentDate),
        amount: valuePerInstallment,
      };
    });
  };

  const preview = previewInstallments();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasExistingInstallments && (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Já existem parcelas geradas. Delete-as antes de gerar novas.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <Label className="text-xs">Data de Início do Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && onStartDateChange(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick Presets */}
          <div>
            <Label className="text-xs">Presets Rápidos</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {presets.map((preset) => (
                <Badge
                  key={preset.label}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
                    JSON.stringify(installmentDays) === JSON.stringify(preset.days) && 
                    "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handlePresetSelect(preset.days)}
                >
                  {preset.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Days Input */}
        <div>
          <Label className="text-xs">Dias das Parcelas (intervalo entre cada parcela)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Ex: 7+14+21 ou digite um número"
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              onKeyDown={handleDaysInputKeyDown}
              onBlur={() => {
                if (daysInput.includes('+') || daysInput.includes(',')) {
                  handleTextInput(daysInput);
                  setDaysInput("");
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddDay}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Days badges */}
          {installmentDays.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {installmentDays.map((days, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  Parcela {index + 1}: {days} dias
                  <button
                    type="button"
                    onClick={() => handleRemoveDay(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Prévia das Parcelas (acumulativo)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {preview.map((inst) => (
                <div key={inst.number} className="flex justify-between text-sm p-2 bg-background rounded border">
                  <span className="font-medium">{inst.number}/{preview.length}</span>
                  <span>{format(inst.dueDate, "dd/MM/yyyy")}</span>
                  <span className="font-semibold">{formatCurrency(inst.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          type="button"
          onClick={onGenerate}
          disabled={installmentDays.length === 0 || total <= 0 || hasExistingInstallments || isGenerating}
          className="w-full"
        >
          <Receipt className="h-4 w-4 mr-2" />
          {isGenerating ? "Gerando..." : `Gerar ${installmentDays.length} Parcela(s)`}
        </Button>
      </CardContent>
    </Card>
  );
};
