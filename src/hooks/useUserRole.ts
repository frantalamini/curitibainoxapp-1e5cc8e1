import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useUserRole - Hook central para gerenciamento de roles do usuário
 * 
 * IMPORTANTE: Este hook é crítico para a segurança do app.
 * Mudanças devem ser feitas com cuidado para não quebrar
 * funcionalidades dependentes (ex: aba Financeiro).
 * 
 * Retorna:
 * - roles: array de roles do usuário
 * - loading: true enquanto carrega
 * - error: erro se houver falha (NOVO)
 * - refetch: função para recarregar roles (NOVO)
 * - isAdmin, isTechnician, isUser, isClient: helpers booleanos
 */
export const useUserRole = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchRoles = useCallback(async (currentUserId: string | null) => {
    if (!currentUserId) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId);

      if (queryError) {
        console.error("❌ useUserRole - Error fetching roles:", queryError);
        setError(queryError);
        setRoles([]);
      } else {
        const fetchedRoles = data?.map((r) => r.role) || [];
        console.log("🔐 useUserRole - User ID:", currentUserId);
        console.log("🔐 useUserRole - Roles fetched:", fetchedRoles);
        console.log("🔐 useUserRole - isAdmin:", fetchedRoles.includes("admin"));
        setRoles(fetchedRoles);
        setError(null);
      }
    } catch (err) {
      console.error("❌ useUserRole - Exception:", err);
      setError(err instanceof Error ? err : new Error("Erro desconhecido ao carregar roles"));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função refetch manual para retry
  const refetch = useCallback(() => {
    if (userId) {
      console.log("🔄 useUserRole - Refetching roles for user:", userId);
      fetchRoles(userId);
    }
  }, [userId, fetchRoles]);

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;
      setUserId(currentUserId);
      fetchRoles(currentUserId);
    };

    getInitialUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUserId = session?.user?.id || null;
        
        // Only refetch if user changed
        if (newUserId !== userId) {
          console.log("🔐 useUserRole - Auth state changed:", event, "User:", newUserId);
          setUserId(newUserId);
          fetchRoles(newUserId);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRoles, userId]);

  return {
    roles,
    loading,
    error,
    refetch,
    // Helpers só retornam true se loading=false E error=null
    isAdmin: !loading && !error && roles.includes("admin"),
    isTechnician: !loading && !error && roles.includes("technician"),
    isUser: !loading && !error && roles.includes("user"),
    isClient: !loading && !error && roles.includes("client"),
  };
};
