import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, Plus, Pencil, Trash2, Building2, Tags, Layers } from "lucide-react";
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
import { format } from "date-fns";

type AccountFormData = {
  name: string;
  bank_name: string;
  account_type: "bank" | "cash" | "other";
  opening_balance: string;
  opening_balance_date: string;
};

type CategoryFormData = {
  name: string;
  type: "income" | "expense";
};

type CostCenterFormData = {
  name: string;
};

export default function ConfiguracoesFinanceiras() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { accounts, isLoading: accountsLoading, createAccount, updateAccount, deleteAccount, toggleActive: toggleAccountActive } = useFinancialAccounts();
  const { categories, isLoading: categoriesLoading, createCategory, updateCategory, deleteCategory, toggleActive: toggleCategoryActive } = useFinancialCategories();
  const { costCenters, isLoading: costCentersLoading, createCostCenter, updateCostCenter, deleteCostCenter, toggleActive: toggleCostCenterActive } = useCostCenters();

  // Dialog states
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormData>({
    name: "",
    bank_name: "",
    account_type: "bank",
    opening_balance: "0",
    opening_balance_date: format(new Date(), "yyyy-MM-dd"),
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
    type: "expense",
  });

  const [costCenterDialogOpen, setCostCenterDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [costCenterForm, setCostCenterForm] = useState<CostCenterFormData>({
    name: "",
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
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: "",
        bank_name: "",
        account_type: "bank",
        opening_balance: "0",
        opening_balance_date: format(new Date(), "yyyy-MM-dd"),
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
      setCategoryForm({ name: category.name, type: category.type });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", type: "expense" });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const data = {
      name: categoryForm.name,
      type: categoryForm.type,
      parent_id: null,
      is_active: true,
    };

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
    } else {
      await createCategory.mutateAsync(data);
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

  const isLoading = roleLoading || accountsLoading || categoriesLoading || costCentersLoading;

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
        <PageHeader title="Configurações Financeiras" />

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Contas</span>
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
      </PageContainer>
    </MainLayout>
  );
}
