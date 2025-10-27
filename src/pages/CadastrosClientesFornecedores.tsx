import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CadastrosTabs } from "@/components/CadastrosTabs";
import { CadastrosTable } from "@/components/CadastrosTable";
import { CadastrosMobileCard } from "@/components/CadastrosMobileCard";
import { CadastrosPagination } from "@/components/CadastrosPagination";
import { CadastrosEmptyState } from "@/components/CadastrosEmptyState";
import { useCadastros, CadastroTipo } from "@/hooks/useCadastros";
import { Plus, Printer, MoreVertical, Search } from "lucide-react";

export default function CadastrosClientesFornecedores() {
  const navigate = useNavigate();
  
  // Estados de filtros
  const [activeTab, setActiveTab] = useState<CadastroTipo | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<'full_name' | 'created_at'>('full_name');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados de seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Hook de dados
  const { 
    cadastros, 
    count, 
    totalPages, 
    currentPage,
    counters, 
    isLoading,
    deleteCadastro 
  } = useCadastros({
    tipo: activeTab,
    search: debouncedSearch,
    page,
    perPage: 10,
    orderBy,
    orderDirection,
  });

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset para primeira página ao buscar
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page quando trocar de aba
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Limpar estados ao montar componente para evitar overlay preso
  useEffect(() => {
    setSelectedIds([]);
    setDeleteId(null);
    document.body.classList.remove('overflow-hidden');
    document.body.style.removeProperty('pointer-events');
  }, []);

  // Handlers de seleção
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(cadastros.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  // Handlers de ações
  const handleDelete = () => {
    if (deleteId) {
      deleteCadastro.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null);
          setSelectedIds(selectedIds.filter(id => id !== deleteId));
        },
      });
    }
  };

  const handleSort = (field: 'full_name' | 'created_at') => {
    if (orderBy === field) {
      setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(field);
      setOrderDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveTab('todos');
    setPage(1);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes e Fornecedores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {count} {count === 1 ? 'registro' : 'registros'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button size="sm" onClick={() => navigate('/cadastros/novo')}>
              <Plus className="h-4 w-4 mr-2" />
              Incluir Cadastro
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Mais ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Exportar para Excel</DropdownMenuItem>
                <DropdownMenuItem>Importar de CSV</DropdownMenuItem>
                {selectedIds.length > 0 && (
                  <DropdownMenuItem className="text-destructive">
                    Excluir selecionados ({selectedIds.length})
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Sticky header: Busca + Abas */}
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 border-b">
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquise por nome, código, fantasia, e-mail ou CPF/CNPJ"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Abas de filtro */}
        <CadastrosTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as CadastroTipo | 'todos')}
          counters={counters}
        />
      </div>

        {/* Conteúdo principal */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : cadastros.length === 0 ? (
          <CadastrosEmptyState
            type={searchTerm || activeTab !== 'todos' ? 'no-results' : 'no-data'}
            searchTerm={searchTerm}
            onReset={handleResetFilters}
          />
        ) : (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden md:block">
              <CadastrosTable
                cadastros={cadastros}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectOne={handleSelectOne}
                onEdit={(id) => navigate(`/cadastros/clientes/${id}/editar`)}
                onView={(id) => navigate(`/cadastros/clientes/${id}`)}
                onDelete={(id) => setDeleteId(id)}
                orderBy={orderBy}
                orderDirection={orderDirection}
                onSort={handleSort}
              />
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {cadastros.map((cadastro) => (
                <CadastrosMobileCard
                  key={cadastro.id}
                  cadastro={cadastro}
                  isSelected={selectedIds.includes(cadastro.id)}
                  onSelect={(checked) => handleSelectOne(cadastro.id, checked)}
                  onEdit={(id) => navigate(`/cadastros/clientes/${id}/editar`)}
                  onView={(id) => navigate(`/cadastros/clientes/${id}`)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <CadastrosPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={count}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Modal de confirmação de exclusão */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este cadastro? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
