import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchRoles = useCallback(async (currentUserId: string | null) => {
    if (!currentUserId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error fetching roles:", error);
        setRoles([]);
      } else {
        const fetchedRoles = data?.map((r) => r.role) || [];
        console.log("🔐 useUserRole - User ID:", currentUserId);
        console.log("🔐 useUserRole - Roles fetched:", fetchedRoles);
        console.log("🔐 useUserRole - isAdmin:", fetchedRoles.includes("admin"));
        setRoles(fetchedRoles);
      }
    } catch (error) {
      console.error("Error in fetchRoles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    isAdmin: !loading && roles.includes("admin"),
    isTechnician: !loading && roles.includes("technician"),
    isUser: !loading && roles.includes("user"),
    isClient: !loading && roles.includes("client"),
  };
};
