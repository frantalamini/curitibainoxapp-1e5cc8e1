import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Lock, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useCurrentUserProfilePermissions,
  hasProfilePermission,
} from "@/hooks/useAccessProfiles";
import { SystemModule } from "@/hooks/useUserPermissions";
import type { ProfilePermissionItem } from "@/hooks/useAccessProfiles";
import { useUserRole } from "@/hooks/useUserRole";

// ============================================================
// Mensagem de acesso negado (reutilizável em componentes)
// ============================================================

export const AccessDeniedMessage = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
    <Lock className="w-8 h-8" />
    <p className="font-medium">Acesso Restrito</p>
    <p className="text-sm text-center">
      {message ?? "Você não tem permissão para acessar esta área."}
    </p>
  </div>
);

// ============================================================
// Guard de componente — mostra/oculta conteúdo
// ============================================================

interface PermissionGuardProps {
  module: SystemModule;
  action: keyof ProfilePermissionItem;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * PermissionGuard — envolve conteúdo que requer permissão.
 * Renderiza o conteúdo se o usuário tiver a permissão, caso contrário mostra o fallback.
 */
export const PermissionGuard = ({
  module,
  action,
  children,
  fallback,
}: PermissionGuardProps) => {
  const { data, isLoading, error, refetch } =
    useCurrentUserProfilePermissions();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Verificando permissões...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span>Erro ao verificar permissões.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasProfilePermission(data, module, action)) {
    return <>{fallback ?? <AccessDeniedMessage />}</>;
  }

  return <>{children}</>;
};

// ============================================================
// Guard de rota — redireciona se não tiver permissão
// ============================================================

interface RoutePermissionGuardProps {
  module: SystemModule;
  action: keyof ProfilePermissionItem;
  children: ReactNode;
  redirectTo?: string;
  /** Roles que podem acessar independente da permissão de perfil */
  allowRoles?: Array<"admin" | "technician">;
}

/**
 * RoutePermissionGuard — usado em rotas do App.tsx.
 * Redireciona para `redirectTo` se não tiver permissão.
 */
export const RoutePermissionGuard = ({
  module,
  action,
  children,
  redirectTo = "/inicio",
  allowRoles,
}: RoutePermissionGuardProps) => {
  const { data, isLoading } = useCurrentUserProfilePermissions();
  const { isAdmin, isTechnician, loading: rolesLoading } = useUserRole();

  if (isLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Verificar se o role do usuário está na lista de roles permitidos
  const roleAllowed =
    allowRoles &&
    ((allowRoles.includes("admin") && isAdmin) ||
      (allowRoles.includes("technician") && isTechnician));

  if (!roleAllowed && !hasProfilePermission(data, module, action)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
