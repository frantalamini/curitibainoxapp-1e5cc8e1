import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserProfilePermissions } from "./useAccessProfiles";

/**
 * useUserRole - Hook central para gerenciamento de roles do usuário
 *
 * Migrado para React Query com key estável ["user-roles"].
 * Todos os componentes compartilham uma única entrada no cache —
 * independente de quantas instâncias estejam montadas simultaneamente.
 * Isso elimina o padrão de 25+ queries simultâneas para user_roles.
 *
 * Cache: staleTime 5min / gcTime 30min
 * Invalida automaticamente ao detectar logout via onAuthStateChange.
 */
export const useUserRole = () => {
  const queryClient = useQueryClient();
  const { data: profilePerms } = useCurrentUserProfilePermissions();

  // Única assinatura de auth por instância — invalida o cache global ao mudar de usuário
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const {
    data: roles = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return [] as string[];

      const { data, error: queryError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (queryError) throw queryError;
      return (data?.map((r) => r.role) ?? []) as string[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const loading = isLoading;
  const hasLegacyRole = (role: string) =>
    !loading && !error && roles.includes(role);

  return {
    roles,
    loading,
    error: error as Error | null,
    refetch,
    isAdmin: hasLegacyRole("admin"),
    isTechnician:
      hasLegacyRole("technician") || (profilePerms?.isTecnico ?? false),
    isUser: hasLegacyRole("user"),
    isClient: hasLegacyRole("client"),
  };
};
