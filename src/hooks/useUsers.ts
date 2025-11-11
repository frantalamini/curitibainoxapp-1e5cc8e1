import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AppRole = "admin" | "technician";

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  username?: string;
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
        .select("id, user_id, full_name, username, phone")
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
          username: profile.username || undefined,
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

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId,
      username,
      full_name, 
      phone
    }: { 
      userId: string;
      username?: string;
      full_name?: string; 
      phone?: string; 
    }) => {
      // First check if username is being changed and if it already exists
      if (username) {
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .neq("user_id", userId)
          .single();

        if (existingProfile) {
          throw new Error("Nome de usuário já existe");
        }
      }

      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      username,
      email, 
      password, 
      full_name, 
      phone, 
      role 
    }: { 
      username: string;
      email: string; 
      password: string; 
      full_name: string; 
      phone?: string; 
      role: AppRole;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { username, email, password, full_name, phone, role }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Ocorreu um erro ao criar o usuário.";
      
      // Traduzir mensagens de erro específicas
      if (errorMessage.includes("already registered") || errorMessage.includes("já está cadastrado")) {
        errorMessage = "Este email já está cadastrado no sistema.";
      } else if (errorMessage.includes("Username already exists") || errorMessage.includes("já existe")) {
        errorMessage = "Este nome de usuário já está em uso.";
      }
      
      toast({
        title: "Erro ao criar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};
