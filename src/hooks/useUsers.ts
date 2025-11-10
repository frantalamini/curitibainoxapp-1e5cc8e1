import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AppRole = "admin" | "technician";

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  roles: AppRole[];
}

export const useAllUsers = () => {
  return useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Buscar roles de todos os usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combinar dados
      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const roles = userRoles
          .filter((ur) => ur.user_id === profile.user_id)
          .map((ur) => ur.role as AppRole);

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: undefined,
          phone: profile.phone,
          roles,
        };
      });

      return usersWithRoles;
    },
  });
};

export const useAddUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Role adicionada",
        description: "A role foi adicionada com sucesso ao usuário.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Role removida",
        description: "A role foi removida com sucesso do usuário.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
