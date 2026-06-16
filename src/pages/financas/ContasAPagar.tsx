import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, Link } from "react-router-dom";
import {
  Loader2,
  FileText,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  CreditCard,
  ScanLine,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import {
  usePayables,
  PayableInsert,
  PayableInsertWithInstallments,
  InstallmentRow,
} from "@/hooks/usePayables";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import {
  useFinancialCategories,
  FinancialCategoryInsert,
} from "@/hooks/useFinancialCategories";
import { useCostCenters } from "@/hooks/useCostCenters";
import { useCreditCards, calculateStatementDate } from "@/hooks/useCreditCards";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useClientSearch } from "@/hooks/useClientSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useCadastros } from "@/hooks/useCadastros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BANK_RECONCILIATION_ENABLED } from "@/lib/constants";
import { DRE_GROUP_OPTIONS } from "@/lib/dreConstants";
import {
  ReceiptOCRCapture,
  OCRResult,
} from "@/components/financas/ReceiptOCRCapture";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const getStatusBadge = (status: string) => {
  switch (status) {
    case "OPEN":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
        >
          Em Aberto
        </Badge>
      );
    case "PAID":
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-600 border-green-500/30"
        >
          Pago
        </Badge>
      );
    case "CANCELED":
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-600 border-red-500/30"
        >
          Cancelado
        </Badge>
      );
    case "PARTIAL":
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-600 border-blue-500/30"
        >
          Parcial
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const INSTALLMENT_DAYS_PRESETS = [21, 56, 84];

function generateInstallmentDays(count: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i < INSTALLMENT_DAYS_PRESETS.length) {
      days.push(INSTALLMENT_DAYS_PRESETS[i]);
    } else {
      days.push(
        INSTALLMENT_DAYS_PRESETS[INSTALLMENT_DAYS_PRESETS.length - 1] +
          (i - INSTALLMENT_DAYS_PRESETS.length + 1) * 28,
      );
    }
  }
  return days;
}

interface FormState extends PayableInsert {
  purchase_type: "avista" | "parcelada";
  installment_count: number;
  installments: InstallmentRow[];
  issue_date: string;
  document_number: string;
}

const emptyForm: FormState = {
  client_id: null,
  description: "",
  due_date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  category_id: null,
  cost_center_id: null,
  financial_account_id: null,
  payment_method: null,
  notes: null,
  credit_card_id: null,
  credit_card_statement_date: null,
  purchase_type: "avista",
  installment_count: 1,
  installments: [],
  issue_date: format(new Date(), "yyyy-MM-dd"),
  document_number: "",
};

// --- Supplier Combobox ---
function SupplierCombobox({
  value,
  onChange,
  onNewClick,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  onNewClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: results, isLoading } = useClientSearch(debouncedSearch, open);

  const { data: selectedSupplier } = useQuery({
    queryKey: ["client", value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, nome_fantasia, cpf_cnpj")
        .eq("id", value)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!value,
  });

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
            >
              {selectedSupplier ? (
                <span className="truncate">{selectedSupplier.full_name}</span>
              ) : (
                <span className="text-muted-foreground">
                  Pesquise pelo nome do fornecedor...
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[95vw] sm:w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Buscar por nome, fantasia ou CNPJ..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading
                    ? "Buscando..."
                    : searchTerm.length < 2
                      ? "Digite pelo menos 2 caracteres"
                      : "Nenhum resultado"}
                </CommandEmpty>
                {results && results.length > 0 && (
                  <CommandGroup>
                    {results.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => {
                          onChange(client.id);
                          setOpen(false);
                          setSearchTerm("");
                        }}
                        className="flex items-start gap-2 py-3"
                      >
                        <Check
                          className={cn(
                            "mt-1 h-4 w-4 shrink-0",
                            value === client.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {client.full_name}
                          </span>
                          {(client.nome_fantasia || client.cpf_cnpj) && (
                            <span className="text-xs text-muted-foreground truncate">
                              {client.nome_fantasia}
                              {client.nome_fantasia && client.cpf_cnpj && " · "}
                              {client.cpf_cnpj}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            title="Limpar"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNewClick}
          title="Novo Fornecedor"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- New Supplier Dialog ---
function NewSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { createCadastro } = useCadastros();
  const [form, setForm] = useState({
    full_name: "",
    nome_fantasia: "",
    cpf_cnpj: "",
    phone: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.full_name || !form.phone) return;
    setSaving(true);
    try {
      const result = await createCadastro.mutateAsync({
        full_name: form.full_name,
        nome_fantasia: form.nome_fantasia || undefined,
        cpf_cnpj: form.cpf_cnpj || undefined,
        phone: form.phone,
        email: form.email || undefined,
        cep: form.cep || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        tipo: "fornecedor",
        tipos: ["fornecedor"],
      });
      onCreated(result.id);
      onOpenChange(false);
      setForm({
        full_name: "",
        nome_fantasia: "",
        cpf_cnpj: "",
        phone: "",
        email: "",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Fornecedor</DialogTitle>
          <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Razão Social *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Razão Social ou Nome"
            />
          </div>
          <div>
            <Label>Nome Fantasia</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) =>
                setForm({ ...form, nome_fantasia: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF/CNPJ</Label>
              <Input
                value={form.cpf_cnpj}
                onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Rua</Label>
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Número</Label>
              <Input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Complemento</Label>
              <Input
                value={form.complement}
                onChange={(e) =>
                  setForm({ ...form, complement: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Bairro</Label>
              <Input
                value={form.neighborhood}
                onChange={(e) =>
                  setForm({ ...form, neighborhood: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                maxLength={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.full_name || !form.phone || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- New Category Dialog ---
function NewCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { createCategory } = useFinancialCategories();
  const [form, setForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    dre_group: "",
  });

  const handleSave = async () => {
    if (!form.name) return;
    const result = await createCategory.mutateAsync({
      name: form.name,
      type: form.type,
      parent_id: null,
      is_active: true,
      dre_group: (form.dre_group || null) as any,
    } as any);
    onCreated(result.id);
    onOpenChange(false);
    setForm({ name: "", type: "expense", dre_group: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription>
            Preencha os dados da categoria (Plano de Contas)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Manutenção de Veículos"
            />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as "income" | "expense" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grupo DRE</Label>
            <Select
              value={form.dre_group || "__none__"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  dre_group: v === "__none__" ? "" : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {DRE_GROUP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Define onde essa categoria aparece no DRE
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name || createCategory.isPending}
          >
            {createCategory.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================
// Main Component
// ===========================================
export default function ContasAPagar() {
  const queryClient = useQueryClient();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts } = useFinancialAccounts();
  const { expenseCategories } = useFinancialCategories();
  const { costCenters } = useCostCenters();
  const { activeCards } = useCreditCards();
  const { activePaymentMethods } = usePaymentMethods();

  // Filters
  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfMonth(today), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(today), "yyyy-MM-dd"),
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const {
    payables,
    isLoading,
    createPayable,
    updatePayable,
    markAsPaid,
    cancelPayable,
    deletePayable,
    summary,
  } = usePayables({
    startDate,
    endDate,
    status: statusFilter,
    supplierId: supplierFilter || undefined,
    categoryId: categoryFilter || undefined,
  });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Dialogs
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  // Mark as paid dialog
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [payDate, setPayDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAccountId, setPayAccountId] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const handleOCRExtracted = (data: OCRResult) => {
    setForm((prev) => ({
      ...prev,
      description: data.description || prev.description,
      amount: data.amount || prev.amount,
      due_date: data.date || prev.due_date,
    }));
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      client_id: p.client_id,
      description: p.description || "",
      due_date: p.due_date,
      amount: Number(p.amount),
      category_id: p.category_id,
      cost_center_id: p.cost_center_id,
      financial_account_id: p.financial_account_id,
      payment_method: p.payment_method,
      notes: p.notes,
      credit_card_id: p.credit_card_id,
      credit_card_statement_date: p.credit_card_statement_date,
      purchase_type: "avista",
      installment_count: 1,
      installments: [],
      issue_date: p.issue_date || format(new Date(), "yyyy-MM-dd"),
      document_number: p.document_number || "",
    });
    setFormOpen(true);
  };

  // Generate installments when count or amount changes in parcelada mode
  const regenerateInstallments = (
    count: number,
    totalAmount: number,
    issueDate: string,
    creditCardId: string | null,
  ) => {
    if (count < 2) return [];

    const days = generateInstallmentDays(count);
    const valuePerInst = Math.round((totalAmount / count) * 100) / 100;
    const remainder =
      Math.round((totalAmount - valuePerInst * count) * 100) / 100;
    const baseDate = issueDate ? new Date(issueDate + "T12:00:00") : new Date();

    const card = creditCardId
      ? activeCards.find((c) => c.id === creditCardId)
      : null;

    return days.map((d, idx) => {
      const dueDate = addDays(baseDate, d);
      const statementDate = card
        ? calculateStatementDate(dueDate, card.closing_day, card.due_day)
        : null;

      return {
        due_date: format(dueDate, "yyyy-MM-dd"),
        amount: idx === count - 1 ? valuePerInst + remainder : valuePerInst,
        credit_card_statement_date: statementDate
          ? format(statementDate, "yyyy-MM-dd")
          : null,
      };
    });
  };

  const handlePurchaseTypeChange = (type: "avista" | "parcelada") => {
    if (type === "parcelada" && form.installment_count < 2) {
      const count = 2;
      const installments = regenerateInstallments(
        count,
        form.amount,
        form.issue_date,
        form.credit_card_id || null,
      );
      setForm({
        ...form,
        purchase_type: type,
        installment_count: count,
        installments,
      });
    } else {
      setForm({ ...form, purchase_type: type });
    }
  };

  const handleInstallmentCountChange = (count: number) => {
    if (count < 2) count = 2;
    if (count > 48) count = 48;
    const installments = regenerateInstallments(
      count,
      form.amount,
      form.issue_date,
      form.credit_card_id || null,
    );
    setForm({ ...form, installment_count: count, installments });
  };

  const handleAmountChange = (amount: number) => {
    if (form.purchase_type === "parcelada" && form.installment_count >= 2) {
      const installments = regenerateInstallments(
        form.installment_count,
        amount,
        form.issue_date,
        form.credit_card_id || null,
      );
      setForm({ ...form, amount, installments });
    } else {
      setForm({ ...form, amount });
    }
  };

  const handleInstallmentChange = (
    index: number,
    field: "due_date" | "amount",
    value: string | number,
  ) => {
    const updated = [...form.installments];
    if (field === "due_date") {
      updated[index] = { ...updated[index], due_date: value as string };
      // Recalculate credit card statement date if applicable
      const card = form.credit_card_id
        ? activeCards.find((c) => c.id === form.credit_card_id)
        : null;
      if (card && value) {
        const dueDate = new Date((value as string) + "T12:00:00");
        const statementDate = calculateStatementDate(
          dueDate,
          card.closing_day,
          card.due_day,
        );
        updated[index].credit_card_statement_date = format(
          statementDate,
          "yyyy-MM-dd",
        );
      }
    } else {
      updated[index] = {
        ...updated[index],
        amount: typeof value === "string" ? parseFloat(value) || 0 : value,
      };
    }
    setForm({ ...form, installments: updated });
  };

  const handleCreditCardChange = (cardId: string | null) => {
    if (!cardId) {
      setForm({
        ...form,
        credit_card_id: null,
        credit_card_statement_date: null,
        payment_method:
          form.payment_method === "Cartão de Crédito"
            ? null
            : form.payment_method,
      });
      return;
    }

    const card = activeCards.find((c) => c.id === cardId);
    if (card) {
      if (form.purchase_type === "parcelada" && form.installments.length > 0) {
        const updatedInstallments = form.installments.map((inst) => {
          const dueDate = new Date(inst.due_date + "T12:00:00");
          const statementDate = calculateStatementDate(
            dueDate,
            card.closing_day,
            card.due_day,
          );
          return {
            ...inst,
            credit_card_statement_date: format(statementDate, "yyyy-MM-dd"),
          };
        });
        setForm({
          ...form,
          credit_card_id: cardId,
          payment_method: "Cartão de Crédito",
          installments: updatedInstallments,
        });
      } else {
        const purchaseDate = form.due_date
          ? new Date(form.due_date + "T12:00:00")
          : new Date();
        const statementDate = calculateStatementDate(
          purchaseDate,
          card.closing_day,
          card.due_day,
        );
        setForm({
          ...form,
          credit_card_id: cardId,
          credit_card_statement_date: format(statementDate, "yyyy-MM-dd"),
          payment_method: "Cartão de Crédito",
        });
      }
    }
  };

  const handlePaymentMethodChange = (method: string | null) => {
    if (method !== "Cartão de Crédito") {
      setForm({
        ...form,
        payment_method: method,
        credit_card_id: null,
        credit_card_statement_date: null,
      });
    } else {
      setForm({ ...form, payment_method: method });
    }
  };

  const installmentsTotal = useMemo(() => {
    return form.installments.reduce((sum, inst) => sum + inst.amount, 0);
  }, [form.installments]);

  const handleSave = () => {
    if (!form.description) {
      toast.error("Preencha a descrição");
      return;
    }
    if (form.amount <= 0) {
      toast.error("Informe o valor");
      return;
    }

    if (editingId) {
      updatePayable.mutate(
        {
          id: editingId,
          data: {
            client_id: form.client_id,
            description: form.description,
            due_date: form.due_date,
            amount: form.amount,
            category_id: form.category_id,
            cost_center_id: form.cost_center_id,
            financial_account_id: form.financial_account_id,
            payment_method: form.payment_method,
            notes: form.notes,
            credit_card_id: form.credit_card_id,
            credit_card_statement_date: form.credit_card_statement_date,
            issue_date: form.issue_date || null,
            document_number: form.document_number || null,
          },
        },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      const payload: PayableInsertWithInstallments = {
        client_id: form.client_id,
        description: form.description,
        due_date: form.due_date,
        amount: form.amount,
        category_id: form.category_id,
        cost_center_id: form.cost_center_id,
        financial_account_id: form.financial_account_id,
        payment_method: form.payment_method,
        notes: form.notes,
        credit_card_id: form.credit_card_id,
        credit_card_statement_date: form.credit_card_statement_date,
        issue_date: form.issue_date || null,
        document_number: form.document_number || null,
        purchase_type: form.purchase_type,
        installments:
          form.purchase_type === "parcelada" && form.installments.length > 1
            ? form.installments
            : undefined,
      };
      createPayable.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleMarkAsPaid = () => {
    if (!payDialog.id) return;
    markAsPaid.mutate(
      {
        id: payDialog.id,
        paidAt: new Date(payDate).toISOString(),
        financialAccountId: payAccountId || undefined,
      },
      { onSuccess: () => setPayDialog({ open: false, id: null }) },
    );
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <PageHeader
          title={
            formOpen
              ? editingId
                ? "Editar Conta a Pagar"
                : "Nova Conta a Pagar"
              : "Contas a Pagar"
          }
        >
          <div className="flex gap-2">
            {formOpen ? (
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                <X className="h-4 w-4 mr-2" /> Voltar
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/financas/cartoes">
                    <CreditCard className="h-4 w-4 mr-2" /> Cartões
                  </Link>
                </Button>
                <Button onClick={handleOpenNew}>
                  <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
                </Button>
              </>
            )}
          </div>
        </PageHeader>

        {!formOpen && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Em Aberto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(summary.totalOpen)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.countOpen} título(s)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalPaid)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.countPaid} título(s)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.totalAll)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Excluindo cancelados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs">Data Inicial</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="OPEN">Em Aberto</SelectItem>
                        <SelectItem value="PAID">Pago</SelectItem>
                        <SelectItem value="CANCELED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Fornecedor</Label>
                    <Select
                      value={supplierFilter || "__all__"}
                      onValueChange={(v) =>
                        setSupplierFilter(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={categoryFilter || "__all__"}
                      onValueChange={(v) =>
                        setCategoryFilter(v === "__all__" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {expenseCategories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : payables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhuma conta a pagar
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Clique em "Novo Lançamento" para adicionar.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pago em</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payables.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {p.description || "-"}
                              {p.installment_number && p.installments_total && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({p.installment_number}/{p.installments_total}
                                  )
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.supplier?.full_name || "-"}
                            </TableCell>
                            <TableCell>{p.category?.name || "-"}</TableCell>
                            <TableCell>
                              {format(parseISO(p.due_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(p.amount))}
                            </TableCell>
                            <TableCell>{getStatusBadge(p.status)}</TableCell>
                            <TableCell>
                              {p.paid_at
                                ? format(new Date(p.paid_at), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {p.status === "OPEN" && (
                                  <>
                                    {!BANK_RECONCILIATION_ENABLED && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2"
                                        onClick={() => {
                                          setPayDialog({
                                            open: true,
                                            id: p.id,
                                          });
                                          setPayDate(
                                            format(new Date(), "yyyy-MM-dd"),
                                          );
                                          setPayAccountId("");
                                        }}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2"
                                      onClick={() => handleEdit(p)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-destructive hover:text-destructive"
                                      onClick={() => cancelPayable.mutate(p.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  onClick={() => deletePayable.mutate(p.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* =================== INLINE FORM =================== */}
        {formOpen && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                {/* OCR Capture */}
                {!editingId && (
                  <div className="lg:col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                    <Label className="flex items-center gap-2 text-primary font-medium">
                      <ScanLine className="h-4 w-4" />
                      Ler Nota/Cupom Fiscal
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Tire uma foto ou selecione uma imagem para pré-preencher
                      automaticamente
                    </p>
                    <ReceiptOCRCapture onExtracted={handleOCRExtracted} />
                  </div>
                )}

                {/* Descrição */}
                <div className="lg:col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Ex: Compra de material"
                  />
                </div>

                {/* Fornecedor — Combobox */}
                <div className="lg:col-span-2">
                  <Label>Fornecedor</Label>
                  <SupplierCombobox
                    value={form.client_id}
                    onChange={(id) => setForm({ ...form, client_id: id })}
                    onNewClick={() => setNewSupplierOpen(true)}
                  />
                </div>

                {/* Data de Emissão + Nº Documento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Emissão</Label>
                    <Input
                      type="date"
                      value={form.issue_date}
                      onChange={(e) =>
                        setForm({ ...form, issue_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Nº do Documento</Label>
                    <Input
                      value={form.document_number}
                      onChange={(e) =>
                        setForm({ ...form, document_number: e.target.value })
                      }
                      placeholder="Ex: NF 12345"
                    />
                  </div>
                </div>

                {/* Valor */}
                <div>
                  <Label>Valor Total *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount || ""}
                    onChange={(e) =>
                      handleAmountChange(parseFloat(e.target.value) || 0)
                    }
                    placeholder="R$ 0,00"
                  />
                </div>

                {/* Tipo de Compra: À Vista / Parcelada */}
                {!editingId && (
                  <div>
                    <Label>Tipo de Compra</Label>
                    <RadioGroup
                      value={form.purchase_type}
                      onValueChange={(v) =>
                        handlePurchaseTypeChange(v as "avista" | "parcelada")
                      }
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="avista" id="avista" />
                        <Label
                          htmlFor="avista"
                          className="cursor-pointer font-normal"
                        >
                          À Vista
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="parcelada" id="parcelada" />
                        <Label
                          htmlFor="parcelada"
                          className="cursor-pointer font-normal"
                        >
                          Parcelada
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* À Vista: Vencimento */}
                {form.purchase_type === "avista" && (
                  <div>
                    <Label>Vencimento *</Label>
                    <Input
                      type="date"
                      value={form.due_date}
                      onChange={(e) =>
                        setForm({ ...form, due_date: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* Parcelada: Número de parcelas + tabela */}
                {form.purchase_type === "parcelada" && !editingId && (
                  <div className="lg:col-span-2 space-y-3">
                    <div>
                      <Label>Número de Parcelas</Label>
                      <Input
                        type="number"
                        min="2"
                        max="48"
                        value={form.installment_count}
                        onChange={(e) =>
                          handleInstallmentCountChange(
                            parseInt(e.target.value) || 2,
                          )
                        }
                      />
                    </div>

                    {form.installments.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-3 py-2 text-xs font-medium grid grid-cols-12 gap-2">
                          <span className="col-span-2">Nº</span>
                          <span className="col-span-5">Vencimento</span>
                          <span className="col-span-5">Valor</span>
                        </div>
                        {form.installments.map((inst, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 border-t grid grid-cols-12 gap-2 items-center"
                          >
                            <span className="col-span-2 text-sm font-medium">
                              {idx + 1}/{form.installments.length}
                            </span>
                            <div className="col-span-5">
                              <Input
                                type="date"
                                value={inst.due_date}
                                onChange={(e) =>
                                  handleInstallmentChange(
                                    idx,
                                    "due_date",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="col-span-5">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inst.amount || ""}
                                onChange={(e) =>
                                  handleInstallmentChange(
                                    idx,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            {form.payment_method === "Cartão de Crédito" &&
                              inst.credit_card_statement_date && (
                                <div className="col-span-12 text-xs text-muted-foreground pl-2">
                                  Fatura:{" "}
                                  {format(
                                    parseISO(inst.credit_card_statement_date),
                                    "dd/MM/yyyy",
                                  )}
                                </div>
                              )}
                          </div>
                        ))}
                        <div className="px-3 py-2 border-t bg-muted/50 grid grid-cols-12 gap-2">
                          <span className="col-span-7 text-sm font-medium text-right pr-2">
                            Total:
                          </span>
                          <span
                            className={cn(
                              "col-span-5 text-sm font-bold",
                              Math.abs(installmentsTotal - form.amount) > 0.01
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {formatCurrency(installmentsTotal)}
                            {Math.abs(installmentsTotal - form.amount) >
                              0.01 && (
                              <span className="text-xs font-normal ml-1">
                                (dif:{" "}
                                {formatCurrency(
                                  installmentsTotal - form.amount,
                                )}
                                )
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select
                    value={form.payment_method || "__none__"}
                    onValueChange={(v) =>
                      handlePaymentMethodChange(v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {activePaymentMethods?.map((pm) => (
                        <SelectItem key={pm.id} value={pm.name}>
                          {pm.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="Cartão de Crédito">
                        Cartão de Crédito
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seção Cartão de Crédito */}
                {form.payment_method === "Cartão de Crédito" && (
                  <div className="lg:col-span-2 p-3 bg-muted rounded-lg space-y-3">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Cartão de Crédito
                    </Label>
                    <Select
                      value={form.credit_card_id || "__none__"}
                      onValueChange={(v) =>
                        handleCreditCardChange(v === "__none__" ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cartão..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {activeCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}{" "}
                            {card.last_digits
                              ? `(**** ${card.last_digits})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.purchase_type === "avista" &&
                      form.credit_card_id &&
                      form.credit_card_statement_date && (
                        <div className="text-sm text-muted-foreground">
                          Esta despesa será cobrada na fatura com vencimento em{" "}
                          <span className="font-medium text-foreground">
                            {format(
                              parseISO(form.credit_card_statement_date),
                              "dd/MM/yyyy",
                            )}
                          </span>
                        </div>
                      )}
                    {activeCards.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Nenhum cartão cadastrado.{" "}
                        <Link
                          to="/financas/configuracoes"
                          className="text-primary underline"
                        >
                          Cadastrar cartão
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Categoria + botão nova */}
                <div>
                  <Label>Categoria (Plano de Contas)</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.category_id || "__none__"}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          category_id: v === "__none__" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {expenseCategories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setNewCategoryOpen(true)}
                      title="Nova Categoria"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Centro de Custo */}
                <div>
                  <Label>Centro de Custo</Label>
                  <Select
                    value={form.cost_center_id || "__none__"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        cost_center_id: v === "__none__" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {costCenters
                        ?.filter((cc) => cc.is_active)
                        .map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conta Bancária */}
                <div>
                  <Label>Conta Bancária</Label>
                  <Select
                    value={form.financial_account_id || "__none__"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        financial_account_id: v === "__none__" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {accounts
                        ?.filter((a) => a.is_active)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Histórico */}
                <div className="lg:col-span-2">
                  <Label>Histórico</Label>
                  <Textarea
                    value={form.notes || ""}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Descrição detalhada da despesa..."
                    rows={3}
                  />
                </div>

                <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      createPayable.isPending || updatePayable.isPending
                    }
                  >
                    {(createPayable.isPending || updatePayable.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingId ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mark as Paid Dialog */}
        <Dialog
          open={payDialog.open}
          onOpenChange={(open) =>
            setPayDialog({ open, id: open ? payDialog.id : null })
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Conta Bancária (opcional)</Label>
                <Select
                  value={payAccountId || "__none__"}
                  onValueChange={(v) =>
                    setPayAccountId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {accounts
                      ?.filter((a) => a.is_active)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPayDialog({ open: false, id: null })}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={markAsPaid.isPending}
              >
                {markAsPaid.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Supplier Dialog */}
        <NewSupplierDialog
          open={newSupplierOpen}
          onOpenChange={setNewSupplierOpen}
          onCreated={(id) => {
            setForm((prev) => ({ ...prev, client_id: id }));
            queryClient.invalidateQueries({ queryKey: ["client-search"] });
          }}
        />

        {/* New Category Dialog */}
        <NewCategoryDialog
          open={newCategoryOpen}
          onOpenChange={setNewCategoryOpen}
          onCreated={(id) => {
            setForm((prev) => ({ ...prev, category_id: id }));
          }}
        />
      </div>
    </MainLayout>
  );
}
