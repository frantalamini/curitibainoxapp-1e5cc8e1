import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para buscar o perfil do usuário autenticado.
 * Retorna full_name e a inicial para exibição no avatar.
 */
export const useCurrentUserProfile = () => {
  return useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return null;
      }

      if (!data) return null;

      // Extrair primeiro nome e inicial
      const fullName = data.full_name || data.username || data.email || "Usuário";
      const firstName = fullName.split(" ")[0];
      const initial = firstName.charAt(0).toUpperCase();

      return {
        fullName,
        firstName,
        initial,
        email: data.email,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};
