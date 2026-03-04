import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface MultiSelectReassignPopoverProps {
  ofxFitId: string;
  ofxAmount: number;
  availableTransactions: any[];
  currentSelectedIds: string[];
  onConfirm: (ofxFitId: string, selectedIds: string[]) => void;
}

export function MultiSelectReassignPopover({
  ofxFitId,
  ofxAmount,
  availableTransactions,
  currentSelectedIds,
  onConfirm,
}: MultiSelectReassignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentSelectedIds);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setSelected(currentSelectedIds);
    setOpen(isOpen);
  };

  const toggleSelection = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedTotal = useMemo(() => {
    return availableTransactions
      .filter(t => selected.includes(t.id))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selected, availableTransactions]);

  // Combine current selected + available unmatched
  const allOptions = useMemo(() => {
    const ids = new Set(availableTransactions.map(t => t.id));
    return availableTransactions;
  }, [availableTransactions]);

  if (allOptions.length === 0) return null;

  const handleConfirm = () => {
    onConfirm(ofxFitId, selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Alterar match">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground">
            Selecione transações do sistema (múltipla seleção)
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs">Valor OFX: {formatCurrency(Math.abs(ofxAmount))}</span>
            <span className={`text-xs font-medium ${Math.abs(selectedTotal - Math.abs(ofxAmount)) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
              Selecionado: {formatCurrency(selectedTotal)}
            </span>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto divide-y">
          {allOptions.map((tx) => (
            <label
              key={tx.id}
              className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(tx.id)}
                onCheckedChange={() => toggleSelection(tx.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{tx.description || "Sem descrição"}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.paid_at
                    ? format(new Date(tx.paid_at), "dd/MM/yy", { locale: ptBR })
                    : tx.due_date} •{" "}
                  <span className={tx.direction === "PAY" ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(tx.amount)}
                  </span>
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="p-2 border-t flex justify-end">
          <Button size="sm" onClick={handleConfirm} disabled={selected.length === 0}>
            <Check className="h-4 w-4 mr-1" />
            Confirmar ({selected.length})
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
