import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  SystemModule,
  ALL_MODULES,
  MODULE_PARENT,
} from "@/hooks/useUserPermissions";

// ============================================================
// TIPOS
// ============================================================

export interface AccessProfile {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface ProfilePermissionItem {
  module: SystemModule;
  can_view: boolean; // Visualizar: vê o item no menu
  can_consult: boolean; // Consultar: vê o conteúdo
  can_create: boolean; // Criar
  can_edit: boolean; // Editar
  can_delete: boolean; // Excluir
}

export interface CurrentUserProfileData {
  profileId: string | null;
  profileName: string | null;
  isGerencial: boolean;
  isAdm: boolean;
  isTecnico: boolean;
  permissions: ProfilePermissionItem[];
}

// Helper: verifica se o usuário tem uma ação em um módulo
export const hasProfilePermission = (
  data: CurrentUserProfileData | null | undefined,
  module: SystemModule,
  action: keyof ProfilePermissionItem,
): boolean => {
  if (!data) return false;
  if (data.isGerencial) return true;

  // Permissão direta no próprio módulo
  const perm = data.permissions.find((p) => p.module === module);
  if (perm && perm[action] === true) return true;

  // Permissão herdada do módulo-pai (umbrella):
  // ter a ação no pai (ex: "finances") concede a mesma ação a todos os filhos.
  const parent = MODULE_PARENT[module];
  if (parent) {
    const parentPerm = data.permissions.find((p) => p.module === parent);
    if (parentPerm && parentPerm[action] === true) return true;
  }

  return false;
};

// ============================================================
// HOOK: perfil + permissões do usuário logado
// ============================================================

export const useCurrentUserProfilePermissions = () => {
  return useQuery({
    queryKey: ["current-profile-permissions"],
    queryFn: async (): Promise<CurrentUserProfileData> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        return {
          profileId: null,
          profileName: null,
          isGerencial: false,
          isAdm: false,
          isTecnico: true,
          permissions: [],
        };
      }

      // Passo 1: buscar access_profile_id do usuário
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("access_profile_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileRow?.access_profile_id) {
        // Sem perfil atribuído → tratar como Técnico (acesso mínimo)
        return {
          profileId: null,
          profileName: "Técnico",
          isGerencial: false,
          isAdm: false,
          isTecnico: true,
          permissions: [],
        };
      }

      // Passo 2: buscar perfil + permissões
      const { data: apData, error: apError } = await supabase
        .from("access_profiles")
        .select(
          "id, name, profile_permissions(module, can_view, can_consult, can_create, can_edit, can_delete)",
        )
        .eq("id", profileRow.access_profile_id)
        .single();

      if (apError || !apData) {
        return {
          profileId: null,
          profileName: "Técnico",
          isGerencial: false,
          isAdm: false,
          isTecnico: true,
          permissions: [],
        };
      }

      const profileName = apData.name;
      const permissions = (apData.profile_permissions ||
        []) as ProfilePermissionItem[];

      return {
        profileId: apData.id,
        profileName,
        isGerencial: profileName === "Gerencial",
        isAdm: profileName === "Administrativo",
        isTecnico: profileName === "Técnico",
        permissions,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============================================================
// HOOK: listar todos os perfis de acesso
// ============================================================

export const useAccessProfiles = () => {
  return useQuery({
    queryKey: ["access-profiles"],
    queryFn: async (): Promise<AccessProfile[]> => {
      const { data, error } = await supabase
        .from("access_profiles")
        .select("id, name, description, is_system, is_active")
        .order("name");

      if (error) throw error;
      return data as AccessProfile[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================================
// HOOK: permissões de um perfil específico
// ============================================================

export const useProfilePermissions = (profileId: string | null) => {
  return useQuery({
    queryKey: ["profile-permissions", profileId],
    queryFn: async (): Promise<ProfilePermissionItem[]> => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("profile_permissions")
        .select(
          "module, can_view, can_consult, can_create, can_edit, can_delete",
        )
        .eq("profile_id", profileId);

      if (error) throw error;
      return (data || []) as ProfilePermissionItem[];
    },
    enabled: !!profileId,
  });
};

// ============================================================
// HOOK: salvar permissões de um perfil
// ============================================================

export const useSaveProfilePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      permissions,
    }: {
      profileId: string;
      permissions: ProfilePermissionItem[];
    }) => {
      // Upsert — garante que todos os módulos existam
      const rows = ALL_MODULES.map((m) => {
        const perm = permissions.find((p) => p.module === m.key);
        return {
          profile_id: profileId,
          module: m.key,
          can_view: perm?.can_view ?? false,
          can_consult: perm?.can_consult ?? false,
          can_create: perm?.can_create ?? false,
          can_edit: perm?.can_edit ?? false,
          can_delete: perm?.can_delete ?? false,
        };
      });

      const { error } = await supabase
        .from("profile_permissions")
        .upsert(rows, { onConflict: "profile_id,module" });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["profile-permissions", variables.profileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["current-profile-permissions"],
      });
      toast({
        title: "Permissões salvas",
        description: "Matriz de permissões atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar permissões",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================
// HOOK: sincronizar módulos ausentes no banco para todos os perfis
// Roda automaticamente na página de permissões — sem necessidade de SQL manual
// ============================================================

export const useSyncMissingModules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("access_profiles")
        .select("id");
      if (profilesError) throw profilesError;
      if (!profiles?.length) return 0;

      // 2. Buscar todos os pares (profile_id, module) existentes
      const { data: existing, error: existingError } = await supabase
        .from("profile_permissions")
        .select("profile_id, module");
      if (existingError) throw existingError;

      const existingSet = new Set(
        (existing || []).map((e) => `${e.profile_id}:${e.module}`),
      );

      // 3. Montar linhas ausentes
      const missing: {
        profile_id: string;
        module: string;
        can_view: boolean;
        can_consult: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }[] = [];

      for (const profile of profiles) {
        for (const mod of ALL_MODULES) {
          if (!existingSet.has(`${profile.id}:${mod.key}`)) {
            missing.push({
              profile_id: profile.id,
              module: mod.key,
              can_view: false,
              can_consult: false,
              can_create: false,
              can_edit: false,
              can_delete: false,
            });
          }
        }
      }

      if (missing.length === 0) return 0;

      // 4. Inserir ausentes
      const { error: insertError } = await supabase
        .from("profile_permissions")
        .insert(missing);
      if (insertError) throw insertError;

      return missing.length;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        queryClient.invalidateQueries({ queryKey: ["profile-permissions"] });
      }
    },
  });
};

// ============================================================
// HOOK: criar perfil de acesso
// ============================================================

export const useCreateAccessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("access_profiles")
        .insert({
          name,
          description: description || null,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar entradas de permissão zeradas para todos os módulos
      const rows = ALL_MODULES.map((m) => ({
        profile_id: data.id,
        module: m.key,
        can_view: false,
        can_consult: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      }));

      const { error: permError } = await supabase
        .from("profile_permissions")
        .insert(rows);
      if (permError) throw permError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-profiles"] });
      toast({
        title: "Perfil criado",
        description: "Novo perfil de acesso criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================
// HOOK: atualizar perfil de acesso
// ============================================================

export const useUpdateAccessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      is_active,
    }: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("access_profiles")
        .update({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(is_active !== undefined && { is_active }),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-profiles"] });
      queryClient.invalidateQueries({
        queryKey: ["current-profile-permissions"],
      });
      toast({ title: "Perfil atualizado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// ============================================================
// HOOK: buscar o perfil atribuído a um usuário específico
// ============================================================

export const useUserProfileAssignment = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-profile-assignment", userId],
    queryFn: async (): Promise<string | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("access_profile_id")
        .eq("user_id", userId)
        .single();
      if (error) return null;
      return data?.access_profile_id ?? null;
    },
    enabled: !!userId,
  });
};

// ============================================================
// HOOK: atribuir perfil a um usuário
// ============================================================

export const useAssignUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      profileId,
    }: {
      userId: string;
      profileId: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ access_profile_id: profileId })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({
        queryKey: ["current-profile-permissions"],
      });
      toast({
        title: "Perfil atribuído",
        description: "Perfil do usuário atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atribuir perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
