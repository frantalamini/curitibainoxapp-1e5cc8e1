import { MainLayout } from "@/components/MainLayout";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2, TrendingUp } from "lucide-react";

export default function FluxoDeCaixa() {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
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

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Fluxo de Caixa" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Módulo em Construção
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Em breve você poderá visualizar o fluxo de caixa completo da empresa aqui.
          </p>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
