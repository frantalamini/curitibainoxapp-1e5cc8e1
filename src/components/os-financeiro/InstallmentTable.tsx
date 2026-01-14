import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, X, RefreshCw, Trash2, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinancialTransaction } from "@/hooks/useFinancialTransactions";

interface InstallmentTableProps {
  transactions: FinancialTransaction[];
  onMarkAsPaid: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FinancialTransaction>) => void;
  onRecalculate?: () => void;
  summary: {
    open: number;
    paid: number;
    total: number;
  };
  isUpdating?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outros: "Outros",
};

export const InstallmentTable = ({
  transactions,
  onMarkAsPaid,
  onCancel,
  onDelete,
  onUpdate,
  onRecalculate,
  summary,
  isUpdating = false,
}: InstallmentTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();

  const handleStartEdit = (transaction: FinancialTransaction) => {
    setEditingId(transaction.id);
    setEditAmount(transaction.amount);
    setEditDueDate(new Date(transaction.due_date + "T12:00:00"));
  };

  const handleSaveEdit = (id: string) => {
    if (editDueDate) {
      onUpdate(id, {
        amount: editAmount,
        due_date: format(editDueDate, "yyyy-MM-dd"),
      });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListOrdered className="w-5 h-5" />
            Parcelas Geradas
          </CardTitle>
          {onRecalculate && (
            <Button type="button" variant="outline" size="sm" onClick={onRecalculate}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Recalcular
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className={editingId === t.id ? "bg-muted/50" : ""}>
                  <TableCell className="font-medium">
                    {t.installments_total && t.installments_total > 1
                      ? `${t.installment_number}/${t.installments_total}`
                      : "Única"}
                  </TableCell>
                  <TableCell>
                    {editingId === t.id ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-[130px] justify-start text-left font-normal",
                              !editDueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {editDueDate ? format(editDueDate, "dd/MM/yyyy") : "Data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editDueDate}
                            onSelect={setEditDueDate}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span 
                        className="cursor-pointer hover:underline"
                        onClick={() => t.status === "OPEN" && handleStartEdit(t)}
                      >
                        {format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === t.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(Number(e.target.value))}
                        className="w-24 text-right"
                      />
                    ) : (
                      <span 
                        className={cn(
                          "font-medium",
                          t.status === "OPEN" && "cursor-pointer hover:underline"
                        )}
                        onClick={() => t.status === "OPEN" && handleStartEdit(t)}
                      >
                        {formatCurrency(t.amount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.payment_method ? paymentMethodLabels[t.payment_method] || t.payment_method : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(t.status)}</TableCell>
                  <TableCell>
                    {t.paid_at
                      ? format(new Date(t.paid_at), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {editingId === t.id ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveEdit(t.id)}
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : t.status === "OPEN" ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Marcar como pago"
                          onClick={() => onMarkAsPaid(t.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Cancelar"
                          onClick={() => onCancel(t.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => onDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
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
      </CardContent>
    </Card>
  );
};
