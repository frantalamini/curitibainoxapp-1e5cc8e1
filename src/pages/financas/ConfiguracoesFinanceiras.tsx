import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, Plus, Pencil, Trash2, Building2, Tags, Layers, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialAccounts, FinancialAccount } from "@/hooks/useFinancialAccounts";
import { useFinancialCategories, FinancialCategory } from "@/hooks/useFinancialCategories";
import { useCostCenters, CostCenter } from "@/hooks/useCostCenters";
import { useCreditCards, CreditCard as CreditCardType } from "@/hooks/useCreditCards";
import { format } from "date-fns";
import { DRE_GROUP_LABELS, DRE_GROUP_OPTIONS } from "@/lib/dreConstants";

type AccountFormData = {
  name: string;
  bank_name: string;
  account_type: "bank" | "cash" | "other";
  opening_balance: string;
  opening_balance_date: string;
  agency: string;
  account_number: string;
  manager_name: string;
};

type CategoryFormData = {
  name: string;
  type: "income" | "expense";
  dre_group: string;
};

type CostCenterFormData = {
  name: string;
};

type CreditCardFormData = {
  name: string;
  card_brand: string;
  last_digits: string;
  credit_limit: string;
  due_day: string;
  closing_day: string;
};

export default function ConfiguracoesFinanceiras() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts, isLoading: accountsLoading, createAccount, updateAccount, deleteAccount, toggleActive: toggleAccountActive } = useFinancialAccounts();
  const { categories, isLoading: categoriesLoading, createCategory, updateCategory, deleteCategory, toggleActive: toggleCategoryActive } = useFinancialCategories();
  const { costCenters, isLoading: costCentersLoading, createCostCenter, updateCostCenter, deleteCostCenter, toggleActive: toggleCostCenterActive } = useCostCenters();
  const { creditCards, isLoading: cardsLoading, createCreditCard, updateCreditCard, deleteCreditCard, toggleActive: toggleCardActive } = useCreditCards();

  // Dialog states
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormData>({
    name: "",
    bank_name: "",
    account_type: "bank",
    opening_balance: "0",
    opening_balance_date: format(new Date(), "yyyy-MM-dd"),
    agency: "",
    account_number: "",
    manager_name: "",
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
    type: "expense",
    dre_group: "",
  });

  const [costCenterDialogOpen, setCostCenterDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [costCenterForm, setCostCenterForm] = useState<CostCenterFormData>({
    name: "",
  });

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [cardForm, setCardForm] = useState<CreditCardFormData>({
    name: "",
    card_brand: "",
    last_digits: "",
    credit_limit: "0",
    due_day: "10",
    closing_day: "5",
  });

  // Account handlers
  const handleOpenAccountDialog = (account?: FinancialAccount) => {
    if (account) {
      setEditingAccount(account);
      setAccountForm({
        name: account.name,
        bank_name: account.bank_name || "",
        account_type: account.account_type,
        opening_balance: String(account.opening_balance),
        opening_balance_date: account.opening_balance_date,
        agency: account.agency || "",
        account_number: account.account_number || "",
        manager_name: account.manager_name || "",
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: "",
        bank_name: "",
        account_type: "bank",
        opening_balance: "0",
        opening_balance_date: format(new Date(), "yyyy-MM-dd"),
        agency: "",
        account_number: "",
        manager_name: "",
      });
    }
    setAccountDialogOpen(true);
  };

  const handleSaveAccount = async () => {
    const data = {
      name: accountForm.name,
      bank_name: accountForm.bank_name || null,
      account_type: accountForm.account_type,
      opening_balance: parseFloat(accountForm.opening_balance) || 0,
      opening_balance_date: accountForm.opening_balance_date,
      agency: accountForm.agency || null,
      account_number: accountForm.account_number || null,
      manager_name: accountForm.manager_name || null,
      is_active: true,
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
    } else {
      await createAccount.mutateAsync(data);
    }
    setAccountDialogOpen(false);
  };

  // Category handlers
  const handleOpenCategoryDialog = (category?: FinancialCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, type: category.type, dre_group: category.dre_group || "" });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", type: "expense", dre_group: "" });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const data = {
      name: categoryForm.name,
      type: categoryForm.type,
      parent_id: null,
      is_active: true,
      dre_group: (categoryForm.dre_group || null) as any,
    };

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
    } else {
      await createCategory.mutateAsync(data as any);
    }
    setCategoryDialogOpen(false);
  };

  // Cost Center handlers
  const handleOpenCostCenterDialog = (costCenter?: CostCenter) => {
    if (costCenter) {
      setEditingCostCenter(costCenter);
      setCostCenterForm({ name: costCenter.name });
    } else {
      setEditingCostCenter(null);
      setCostCenterForm({ name: "" });
    }
    setCostCenterDialogOpen(true);
  };

  const handleSaveCostCenter = async () => {
    const data = {
      name: costCenterForm.name,
      is_active: true,
    };

    if (editingCostCenter) {
      await updateCostCenter.mutateAsync({ id: editingCostCenter.id, ...data });
    } else {
      await createCostCenter.mutateAsync(data);
    }
    setCostCenterDialogOpen(false);
  };

  // Credit Card handlers
  const handleOpenCardDialog = (card?: CreditCardType) => {
    if (card) {
      setEditingCard(card);
      setCardForm({
        name: card.name,
        card_brand: card.card_brand || "",
        last_digits: card.last_digits || "",
        credit_limit: String(card.credit_limit),
        due_day: String(card.due_day),
        closing_day: String(card.closing_day),
      });
    } else {
      setEditingCard(null);
      setCardForm({
        name: "",
        card_brand: "",
        last_digits: "",
        credit_limit: "0",
        due_day: "10",
        closing_day: "5",
      });
    }
    setCardDialogOpen(true);
  };

  const handleSaveCard = async () => {
    const data = {
      name: cardForm.name,
      card_brand: cardForm.card_brand || null,
      last_digits: cardForm.last_digits || null,
      credit_limit: parseFloat(cardForm.credit_limit) || 0,
      due_day: parseInt(cardForm.due_day) || 10,
      closing_day: parseInt(cardForm.closing_day) || 5,
    };

    if (editingCard) {
      await updateCreditCard.mutateAsync({ id: editingCard.id, ...data });
    } else {
      await createCreditCard.mutateAsync(data);
    }
    setCardDialogOpen(false);
  };

  const isLoading = roleLoading || accountsLoading || categoriesLoading || costCentersLoading || cardsLoading;

  if (roleLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

  const accountTypeLabels: Record<string, string> = {
    bank: "Banco",
    cash: "Caixa",
    other: "Outro",
  };

  return (
    <MainLayout>
      <PageContainer>
        <div className="w-full max-w-[1400px] mr-auto pl-2 pr-4 sm:pl-3 sm:pr-6 lg:pr-8">
          <PageHeader title="Configurações Financeiras" />

          <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Contas</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Cartões</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
            </TabsTrigger>
            <TabsTrigger value="cost-centers" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Centros</span>
            </TabsTrigger>
          </TabsList>

          {/* Contas Bancárias */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Contas Bancárias</CardTitle>
                  <CardDescription>Gerencie as contas bancárias e caixas da empresa</CardDescription>
                </div>
                <Button onClick={() => handleOpenAccountDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </Button>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conta cadastrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Saldo Inicial</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>{account.bank_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{accountTypeLabels[account.account_type]}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(account.opening_balance)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={account.is_active}
                              onCheckedChange={(checked) => toggleAccountActive.mutate({ id: account.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenAccountDialog(account)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteAccount.mutate(account.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categorias */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categorias</CardTitle>
                  <CardDescription>Categorias para classificar receitas e despesas</CardDescription>
                </div>
                <Button onClick={() => handleOpenCategoryDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Grupo DRE</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <Badge variant={category.type === "income" ? "default" : "destructive"}>
                              {category.type === "income" ? "Receita" : "Despesa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {category.dre_group ? (
                              <Badge variant="outline" className="text-xs">
                                {DRE_GROUP_LABELS[category.dre_group] || category.dre_group}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={category.is_active}
                              onCheckedChange={(checked) => toggleCategoryActive.mutate({ id: category.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenCategoryDialog(category)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCategory.mutate(category.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Centros de Custo */}
          <TabsContent value="cost-centers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Centros de Custo</CardTitle>
                  <CardDescription>Centros de custo para alocação de despesas</CardDescription>
                </div>
                <Button onClick={() => handleOpenCostCenterDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Centro
                </Button>
              </CardHeader>
              <CardContent>
                {costCentersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : costCenters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum centro de custo cadastrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costCenters.map((costCenter) => (
                        <TableRow key={costCenter.id}>
                          <TableCell className="font-medium">{costCenter.name}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={costCenter.is_active}
                              onCheckedChange={(checked) => toggleCostCenterActive.mutate({ id: costCenter.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenCostCenterDialog(costCenter)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCostCenter.mutate(costCenter.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cartões de Crédito */}
          <TabsContent value="cards">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Cartões de Crédito</CardTitle>
                  <CardDescription>Configure seus cartões com datas de vencimento e corte</CardDescription>
                </div>
                <Button onClick={() => handleOpenCardDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cartão
                </Button>
              </CardHeader>
              <CardContent>
                {cardsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : creditCards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum cartão cadastrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Bandeira</TableHead>
                        <TableHead>Final</TableHead>
                        <TableHead className="text-center">Vencimento</TableHead>
                        <TableHead className="text-center">Fechamento</TableHead>
                        <TableHead className="text-right">Limite</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditCards.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell className="font-medium">{card.name}</TableCell>
                          <TableCell>{card.card_brand || "-"}</TableCell>
                          <TableCell>{card.last_digits ? `**** ${card.last_digits}` : "-"}</TableCell>
                          <TableCell className="text-center">Dia {card.due_day}</TableCell>
                          <TableCell className="text-center">Dia {card.closing_day}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.credit_limit)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={card.is_active}
                              onCheckedChange={(checked) => toggleCardActive.mutate({ id: card.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenCardDialog(card)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteCreditCard.mutate(card.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Account Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
              <DialogDescription>
                Preencha os dados da conta bancária ou caixa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="account-name">Nome *</Label>
                <Input
                  id="account-name"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Ex: Conta Corrente Bradesco"
                />
              </div>
              <div>
                <Label htmlFor="bank-name">Banco</Label>
                <Input
                  id="bank-name"
                  value={accountForm.bank_name}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                  placeholder="Ex: Bradesco"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agency">Agência</Label>
                  <Input
                    id="agency"
                    value={accountForm.agency}
                    onChange={(e) => setAccountForm({ ...accountForm, agency: e.target.value })}
                    placeholder="Ex: 1234"
                  />
                </div>
                <div>
                  <Label htmlFor="account-number">Conta</Label>
                  <Input
                    id="account-number"
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                    placeholder="Ex: 12345-6"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="manager-name">Gerente</Label>
                <Input
                  id="manager-name"
                  value={accountForm.manager_name}
                  onChange={(e) => setAccountForm({ ...accountForm, manager_name: e.target.value })}
                  placeholder="Nome do gerente"
                />
              </div>
              <div>
                <Label htmlFor="account-type">Tipo *</Label>
                <Select
                  value={accountForm.account_type}
                  onValueChange={(value) => setAccountForm({ ...accountForm, account_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Banco</SelectItem>
                    <SelectItem value="cash">Caixa</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opening-balance">Saldo Inicial</Label>
                  <Input
                    id="opening-balance"
                    type="number"
                    step="0.01"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="opening-date">Data do Saldo</Label>
                  <Input
                    id="opening-date"
                    type="date"
                    value={accountForm.opening_balance_date}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveAccount} disabled={!accountForm.name || createAccount.isPending || updateAccount.isPending}>
                {(createAccount.isPending || updateAccount.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Dialog */}
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
              <DialogDescription>
                Preencha os dados da categoria
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Nome *</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ex: Manutenção de Veículos"
                />
              </div>
              <div>
                <Label htmlFor="category-type">Tipo *</Label>
                <Select
                  value={categoryForm.type}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, type: value as any })}
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
                <Label htmlFor="category-dre-group">Grupo DRE</Label>
                <Select
                  value={categoryForm.dre_group || "__none__"}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, dre_group: value === "__none__" ? "" : value })}
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
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCategory} disabled={!categoryForm.name || createCategory.isPending || updateCategory.isPending}>
                {(createCategory.isPending || updateCategory.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cost Center Dialog */}
        <Dialog open={costCenterDialogOpen} onOpenChange={setCostCenterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCostCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
              <DialogDescription>
                Preencha o nome do centro de custo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cost-center-name">Nome *</Label>
                <Input
                  id="cost-center-name"
                  value={costCenterForm.name}
                  onChange={(e) => setCostCenterForm({ ...costCenterForm, name: e.target.value })}
                  placeholder="Ex: Administrativo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCostCenterDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCostCenter} disabled={!costCenterForm.name || createCostCenter.isPending || updateCostCenter.isPending}>
                {(createCostCenter.isPending || updateCostCenter.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credit Card Dialog */}
        <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCard ? "Editar Cartão" : "Novo Cartão de Crédito"}</DialogTitle>
              <DialogDescription>
                Configure as datas de vencimento e fechamento do cartão
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-name">Nome do Cartão *</Label>
                <Input
                  id="card-name"
                  value={cardForm.name}
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                  placeholder="Ex: Nubank Empresa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card-brand">Bandeira</Label>
                  <Select
                    value={cardForm.card_brand || "__none__"}
                    onValueChange={(v) => setCardForm({ ...cardForm, card_brand: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="Elo">Elo</SelectItem>
                      <SelectItem value="American Express">American Express</SelectItem>
                      <SelectItem value="Hipercard">Hipercard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="last-digits">Últimos 4 dígitos</Label>
                  <Input
                    id="last-digits"
                    value={cardForm.last_digits}
                    onChange={(e) => setCardForm({ ...cardForm, last_digits: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="closing-day">Dia de Fechamento *</Label>
                  <Input
                    id="closing-day"
                    type="number"
                    min="1"
                    max="31"
                    value={cardForm.closing_day}
                    onChange={(e) => setCardForm({ ...cardForm, closing_day: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Data de corte da fatura</p>
                </div>
                <div>
                  <Label htmlFor="due-day">Dia de Vencimento *</Label>
                  <Input
                    id="due-day"
                    type="number"
                    min="1"
                    max="31"
                    value={cardForm.due_day}
                    onChange={(e) => setCardForm({ ...cardForm, due_day: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Data de pagamento da fatura</p>
                </div>
              </div>
              <div>
                <Label htmlFor="credit-limit">Limite de Crédito</Label>
                <Input
                  id="credit-limit"
                  type="number"
                  step="0.01"
                  value={cardForm.credit_limit}
                  onChange={(e) => setCardForm({ ...cardForm, credit_limit: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCardDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleSaveCard} 
                disabled={!cardForm.name || !cardForm.due_day || !cardForm.closing_day || createCreditCard.isPending || updateCreditCard.isPending}
              >
                {(createCreditCard.isPending || updateCreditCard.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
