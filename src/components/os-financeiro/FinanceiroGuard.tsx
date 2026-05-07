import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Lock, RefreshCw } from "lucide-react";
import {
  useCurrentUserProfilePermissions,
  hasProfilePermission,
} from "@/hooks/useAccessProfiles";
import { FinanceiroTab } from "./FinanceiroTab";

interface FinanceiroGuardProps {
  serviceCallId: string;
  clientId: string;
}

/**
 * FinanceiroGuard — decide a renderização da aba Financeiro.
 *
 * Usa o novo sistema de permissões por perfil (access_profiles + profile_permissions).
 * O acesso exige can_consult=true no módulo "os_aba_financeiro".
 * Técnicos têm can_consult=false → bloqueio total nessa aba.
 */
export const FinanceiroGuard = ({
  serviceCallId,
  clientId,
}: FinanceiroGuardProps) => {
  const { data, isLoading, error, refetch } =
    useCurrentUserProfilePermissions();

  const canAccessFinanceiro = hasProfilePermission(
    data,
    "os_aba_financeiro",
    "can_consult",
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>
            Erro ao verificar permissões. Não foi possível carregar a aba
            Financeiro.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!canAccessFinanceiro) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Lock className="w-8 h-8" />
        <p className="font-medium">Acesso Restrito</p>
        <p className="text-sm text-center">
          Você não tem permissão para acessar o módulo Financeiro.
        </p>
      </div>
    );
  }

  return <FinanceiroTab serviceCallId={serviceCallId} clientId={clientId} />;
};
