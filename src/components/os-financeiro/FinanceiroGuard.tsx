import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Lock, RefreshCw } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { FinanceiroTab } from "./FinanceiroTab";

interface FinanceiroGuardProps {
  serviceCallId: string;
  clientId: string;
}

/**
 * FinanceiroGuard - Componente central que decide a renderização da aba Financeiro
 * 
 * Estados possíveis:
 * 1. Loading: Mostra spinner "Carregando permissões..."
 * 2. Error: Mostra alerta de erro com botão "Tentar novamente"
 * 3. Não-Admin: Mostra placeholder "Acesso Restrito" com ícone de cadeado
 * 4. Admin: Renderiza FinanceiroTab normalmente
 * 
 * IMPORTANTE: Este componente NUNCA deve ser removido ou ter sua lógica alterada
 * sem revisão cuidadosa. A aba Financeiro DEVE sempre existir no DOM.
 */
export const FinanceiroGuard = ({ serviceCallId, clientId }: FinanceiroGuardProps) => {
  const { isAdmin, isTechnician, loading, error, refetch, roles } = useUserRole();
  
  // Regra: técnicos NUNCA veem financeiro, mesmo sendo admin
  const canAccessFinanceiro = isAdmin && !isTechnician;
  
  // DEBUG: Log para diagnóstico
  console.log("🔐 FinanceiroGuard - loading:", loading, "error:", error, "isAdmin:", isAdmin, "isTechnician:", isTechnician, "canAccess:", canAccessFinanceiro, "roles:", roles);

  // Estado: Carregando permissões
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Carregando permissões...</p>
      </div>
    );
  }

  // Estado: Erro ao carregar roles
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>Erro ao verificar permissões. Não foi possível carregar a aba Financeiro.</span>
          <Button variant="outline" size="sm" onClick={refetch} className="shrink-0">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Estado: Usuário não tem acesso (técnicos não veem, mesmo sendo admin)
  if (!canAccessFinanceiro) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Lock className="w-8 h-8" />
        <p className="font-medium">Acesso Restrito</p>
        <p className="text-sm text-center">
          Somente administradores podem acessar o módulo Financeiro.
        </p>
      </div>
    );
  }

  // Estado: Admin - renderiza FinanceiroTab normalmente
  return <FinanceiroTab serviceCallId={serviceCallId} clientId={clientId} />;
};
