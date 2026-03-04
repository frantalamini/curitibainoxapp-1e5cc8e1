import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { useCostCenters } from "@/hooks/useCostCenters";
import { OFXTransaction } from "@/lib/ofxParser";
import { Loader2 } from "lucide-react";

interface ManualIncludeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ofxTransaction: OFXTransaction | null;
  onConfirm: (categoryId: string, costCenterId?: string, description?: string) => Promise<boolean>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ManualIncludeModal({ open, onOpenChange, ofxTransaction, onConfirm }: ManualIncludeModalProps) {
  const { categories } = useFinancialCategories();
  const { costCenters } = useCostCenters();
  const [categoryId, setCategoryId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const activeCategories = categories?.filter(c => c.is_active) || [];
  const activeCostCenters = costCenters?.filter(c => c.is_active) || [];

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && ofxTransaction) {
      setDescription(`Conciliação bancária - ${ofxTransaction.description}`);
      setCategoryId("");
      setCostCenterId("");
    }
    onOpenChange(isOpen);
  };

  const handleIncludeClick = () => {
    if (!categoryId) return;
    setShowConfirmation(true);
  };

  const handleConfirmInclusion = async () => {
    setShowConfirmation(false);
    setIsSaving(true);
    const success = await onConfirm(categoryId, costCenterId || undefined, description || undefined);
    setIsSaving(false);
    if (success) onOpenChange(false);
  };

  if (!ofxTransaction) return null;

  const direction = ofxTransaction.amount < 0 ? "Despesa (Contas a Pagar)" : "Receita (Contas a Receber)";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incluir Lançamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{ofxTransaction.description}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {ofxTransaction.date} • {formatCurrency(Math.abs(ofxTransaction.amount))} • {direction}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Categoria Financeira *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Centro de Custo (opcional)</Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {activeCostCenters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleIncludeClick} disabled={!categoryId || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Incluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar inclusão manual</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fazer inclusão manual deste lançamento?
              <br />
              <strong>{formatCurrency(Math.abs(ofxTransaction.amount))}</strong> — {ofxTransaction.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInclusion}>Sim, incluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
