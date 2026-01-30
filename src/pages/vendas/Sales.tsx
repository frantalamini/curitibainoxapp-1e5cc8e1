import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, ShoppingCart, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSales, SaleStatus } from "@/hooks/useSales";
import { SalesTable } from "@/components/vendas/SalesTable";
import { SaleMobileCard } from "@/components/vendas/SaleMobileCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Sales() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SaleStatus | "ALL">("ALL");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "approve" | "cancel" | "finalize";
    saleId: string;
  } | null>(null);

  const filters = activeTab !== "ALL" ? { status: activeTab } : undefined;
  const { sales, quotes, approved, completed, cancelled, isLoading, approveSale, cancelSale, finalizeSale } = useSales(filters);

  // Filter by search term
  const filteredSales = sales.filter((sale) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      sale.sale_number.toString().includes(searchLower) ||
      sale.clients?.full_name?.toLowerCase().includes(searchLower) ||
      sale.clients?.cpf_cnpj?.includes(searchLower)
    );
  });

  const handleApprove = (id: string) => {
    setConfirmDialog({ open: true, type: "approve", saleId: id });
  };

  const handleCancel = (id: string) => {
    setConfirmDialog({ open: true, type: "cancel", saleId: id });
  };

  const handleFinalize = (id: string) => {
    setConfirmDialog({ open: true, type: "finalize", saleId: id });
  };

  const handleDuplicate = (id: string) => {
    // TODO: Implement duplicate logic
    toast.info("Funcionalidade de duplicar em desenvolvimento");
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;

    const { type, saleId } = confirmDialog;

    try {
      if (type === "approve") {
        await approveSale.mutateAsync(saleId);
      } else if (type === "cancel") {
        await cancelSale.mutateAsync(saleId);
      } else if (type === "finalize") {
        await finalizeSale.mutateAsync(saleId);
      }
    } catch (error) {
      console.error("Error:", error);
    }

    setConfirmDialog(null);
  };

  const getDialogContent = () => {
    if (!confirmDialog) return { title: "", description: "" };

    switch (confirmDialog.type) {
      case "approve":
        return {
          title: "Aprovar Orçamento",
          description: "Tem certeza que deseja aprovar este orçamento? O cliente poderá prosseguir com a compra.",
        };
      case "cancel":
        return {
          title: "Cancelar Venda",
          description: "Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.",
        };
      case "finalize":
        return {
          title: "Finalizar Venda",
          description:
            "Ao finalizar a venda, o estoque será baixado automaticamente e as parcelas financeiras serão geradas. Deseja continuar?",
        };
      default:
        return { title: "", description: "" };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Vendas"
          actionLabel="Novo Orçamento"
          onAction={() => navigate("/vendas/novo")}
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SaleStatus | "ALL")}>
          <TabsList className="grid grid-cols-5 w-full max-w-xl">
            <TabsTrigger value="ALL" className="gap-1">
              Todos
              <span className="text-xs text-muted-foreground">({sales.length})</span>
            </TabsTrigger>
            <TabsTrigger value="QUOTE" className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Orçamentos</span>
              <span className="text-xs text-muted-foreground">({quotes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="APPROVED" className="gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aprovados</span>
              <span className="text-xs text-muted-foreground">({approved.length})</span>
            </TabsTrigger>
            <TabsTrigger value="SALE" className="gap-1">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vendas</span>
              <span className="text-xs text-muted-foreground">({completed.length})</span>
            </TabsTrigger>
            <TabsTrigger value="CANCELLED" className="gap-1">
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cancelados</span>
              <span className="text-xs text-muted-foreground">({cancelled.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {filteredSales.map((sale) => (
                  <SaleMobileCard
                    key={sale.id}
                    sale={sale}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    onFinalize={handleFinalize}
                    onDuplicate={handleDuplicate}
                  />
                ))}
                {filteredSales.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada.
                  </div>
                )}
              </div>
            ) : (
              <SalesTable
                sales={filteredSales}
                onApprove={handleApprove}
                onCancel={handleCancel}
                onFinalize={handleFinalize}
                onDuplicate={handleDuplicate}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </MainLayout>
  );
}
