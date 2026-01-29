import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ProfileType = "gerencial" | "adm" | "tecnico";

export type SystemModule = 
  | "service_calls"
  | "clients"
  | "technicians"
  | "vehicles"
  | "products"
  | "equipment"
  | "schedule"
  | "finances"
  | "settings"
  | "users"
  | "checklists"
  | "service_types"
  | "service_statuses"
  | "payment_methods"
  | "reimbursements";

export interface UserPermission {
  id: string;
  user_id: string;
  profile_type: ProfileType;
  module: SystemModule;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const ALL_MODULES: { key: SystemModule; label: string }[] = [
  { key: "service_calls", label: "Ordens de Serviço" },
  { key: "clients", label: "Clientes/Cadastros" },
  { key: "technicians", label: "Técnicos" },
  { key: "vehicles", label: "Veículos" },
  { key: "products", label: "Produtos" },
  { key: "equipment", label: "Equipamentos" },
  { key: "schedule", label: "Agenda" },
  { key: "finances", label: "Finanças" },
  { key: "settings", label: "Configurações" },
  { key: "users", label: "Usuários" },
  { key: "checklists", label: "Checklists" },
  { key: "service_types", label: "Tipos de Serviço" },
  { key: "service_statuses", label: "Status de OS" },
  { key: "payment_methods", label: "Formas de Pagamento" },
  { key: "reimbursements", label: "Reembolsos" },
];

export const PROFILE_LABELS: Record<ProfileType, string> = {
  gerencial: "Gerencial",
  adm: "Administrativo",
  tecnico: "Técnico",
};

/**
 * Hook para buscar permissões de um usuário específico
 */
export const useUserPermissions = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!userId,
  });
};

/**
 * Hook para buscar o perfil atual do usuário logado
 */
export const useCurrentUserPermissions = () => {
  return useQuery({
    queryKey: ["current-user-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { profileType: null, permissions: [] };
      
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      
      const permissions = data as UserPermission[];
      const profileType = permissions.length > 0 ? permissions[0].profile_type : null;
      
      return { profileType, permissions };
    },
  });
};

/**
 * Hook para salvar permissões de um usuário
 */
export const useSaveUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      profileType,
      permissions,
    }: {
      userId: string;
      profileType: ProfileType;
      permissions: { module: SystemModule; can_view: boolean; can_edit: boolean; can_delete: boolean }[];
    }) => {
      // Deletar permissões existentes
      const { error: deleteError } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Criar array de permissões para inserir
      const permissionsToInsert = ALL_MODULES.map((m) => {
        const perm = permissions.find((p) => p.module === m.key);
        return {
          user_id: userId,
          profile_type: profileType,
          module: m.key,
          can_view: profileType === "gerencial" ? true : (perm?.can_view ?? false),
          can_edit: profileType === "gerencial" ? true : (perm?.can_edit ?? false),
          can_delete: profileType === "gerencial" ? true : (perm?.can_delete ?? false),
        };
      });
      const { error: insertError } = await supabase
        .from("user_permissions")
        .insert(permissionsToInsert);

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["current-user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Permissões salvas",
        description: "As permissões do usuário foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar permissões:", error);
      toast({
        title: "Erro ao salvar permissões",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Helper para verificar se o usuário tem permissão
 */
export const checkPermission = (
  permissions: UserPermission[],
  module: SystemModule,
  action: "view" | "edit" | "delete"
): boolean => {
  if (permissions.length === 0) return false;
  
  // Gerencial tem acesso total
  if (permissions[0]?.profile_type === "gerencial") return true;
  
  const perm = permissions.find((p) => p.module === module);
  if (!perm) return false;
  
  switch (action) {
    case "view":
      return perm.can_view;
    case "edit":
      return perm.can_edit;
    case "delete":
      return perm.can_delete;
    default:
      return false;
  }
};
