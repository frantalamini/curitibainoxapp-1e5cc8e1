/**
 * useModulePermissions
 *
 * Hook centralizado de autorização por módulo.
 * Retorna as 5 flags de permissão (view/consult/create/edit/delete)
 * para qualquer módulo da matriz de perfis de acesso.
 *
 * Gerencial → always true para todas as flags.
 * Outros perfis → lido de profile_permissions via useCurrentUserProfilePermissions.
 *
 * Uso:
 *   const { canCreate, canEdit, canDelete } = useModulePermissions("products");
 */

import {
  useCurrentUserProfilePermissions,
  hasProfilePermission,
} from "@/hooks/useAccessProfiles";
import type { SystemModule } from "@/hooks/useUserPermissions";

export interface ModulePermissions {
  canView: boolean;
  canConsult: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
}

export const useModulePermissions = (
  module: SystemModule,
): ModulePermissions => {
  const { data: profilePerms, isLoading } = useCurrentUserProfilePermissions();

  return {
    canView: hasProfilePermission(profilePerms, module, "can_view"),
    canConsult: hasProfilePermission(profilePerms, module, "can_consult"),
    canCreate: hasProfilePermission(profilePerms, module, "can_create"),
    canEdit: hasProfilePermission(profilePerms, module, "can_edit"),
    canDelete: hasProfilePermission(profilePerms, module, "can_delete"),
    isLoading,
  };
};
